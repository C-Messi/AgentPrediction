package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/joho/godotenv"
)

const predictionMarketABI = `[
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "marketId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "creator", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "question", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "endTime", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "initialYesPred", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "initialNoPred", "type": "uint256" }
    ],
    "name": "MarketCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "marketId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "bool", "name": "isYes", "type": "bool" },
      { "indexed": false, "internalType": "uint256", "name": "predIn", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "sharesOut", "type": "uint256" }
    ],
    "name": "SharesBought",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "marketId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "bool", "name": "isYes", "type": "bool" },
      { "indexed": false, "internalType": "uint256", "name": "sharesIn", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "predOut", "type": "uint256" }
    ],
    "name": "SharesSold",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "marketId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "content", "type": "string" }
    ],
    "name": "Comment",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "marketId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "content", "type": "string" }
    ],
    "name": "Danmaku",
    "type": "event"
  }
]`

type marketCreatedData struct {
	Question       string
	EndTime        *big.Int
	InitialYesPred *big.Int
	InitialNoPred  *big.Int
}

type sharesBoughtData struct {
	IsYes     bool
	PredIn    *big.Int
	SharesOut *big.Int
}

type sharesSoldData struct {
	IsYes    bool
	SharesIn *big.Int
	PredOut  *big.Int
}

type commentData struct {
	Content string
}

func main() {
	_ = godotenv.Load()

	wsURL := flag.String("ws", "", "WebSocket RPC url (or set WS_URL env)")
	contractAddr := flag.String("contract", "", "PredictionMarket contract address (or set CONTRACT_ADDRESS env)")
	httpAddr := flag.String("http", "", "HTTP listen addr (or set HTTP_ADDR env)")
	startFrom := flag.Uint64("from", 0, "start block number (0 = latest only)")
	flag.Parse()

	if *wsURL == "" {
		*wsURL = os.Getenv("WS_URL")
	}
	if *contractAddr == "" {
		*contractAddr = os.Getenv("CONTRACT_ADDRESS")
	}
	if *httpAddr == "" {
		*httpAddr = os.Getenv("HTTP_ADDR")
	}
	if *httpAddr == "" {
		*httpAddr = ":8080"
	}
	if *wsURL == "" || *contractAddr == "" {
		log.Fatalf("missing ws url or contract address (use -ws/-contract or env)")
	}

	contract := common.HexToAddress(*contractAddr)
	parsedABI, err := abi.JSON(strings.NewReader(predictionMarketABI))
	if err != nil {
		log.Fatalf("parse abi: %v", err)
	}

	client, err := ethclient.Dial(*wsURL)
	if err != nil {
		log.Fatalf("dial ws: %v", err)
	}
	defer client.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	store := newMarketStore()
	httpServer := startHTTPServer(*httpAddr, store)

	query := ethereum.FilterQuery{
		Addresses: []common.Address{contract},
	}
	if *startFrom > 0 {
		query.FromBlock = new(big.Int).SetUint64(*startFrom)
	}

	logsCh := make(chan types.Log, 256)
	sub, err := client.SubscribeFilterLogs(ctx, query, logsCh)
	if err != nil {
		log.Fatalf("subscribe logs: %v", err)
	}

	sigint := make(chan os.Signal, 1)
	signal.Notify(sigint, syscall.SIGINT, syscall.SIGTERM)

	log.Printf("listening on %s for %s", *wsURL, contract.Hex())
	for {
		select {
		case err := <-sub.Err():
			log.Fatalf("subscription error: %v", err)
		case vLog := <-logsCh:
			if len(vLog.Topics) == 0 {
				continue
			}
			handleLog(parsedABI, vLog, store)
		case <-sigint:
			log.Printf("shutdown requested")
			if httpServer != nil {
				shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 5*time.Second)
				_ = httpServer.Shutdown(shutdownCtx)
				cancelShutdown()
			}
			return
		}
	}
}

func handleLog(parsedABI abi.ABI, vLog types.Log, store *marketStore) {
	switch vLog.Topics[0] {
	case parsedABI.Events["MarketCreated"].ID:
		var indexed struct {
			MarketId *big.Int
			Creator  common.Address
		}
		if err := abi.ParseTopics(&indexed, indexedArgs(parsedABI.Events["MarketCreated"].Inputs), vLog.Topics[1:]); err != nil {
			log.Printf("MarketCreated parse topics: %v", err)
			return
		}
		var data marketCreatedData
		if err := parsedABI.UnpackIntoInterface(&data, "MarketCreated", vLog.Data); err != nil {
			log.Printf("MarketCreated unpack: %v", err)
			return
		}
		store.addMarketCreated(marketCreatedEvent{
			MarketId:       indexed.MarketId.String(),
			Creator:        indexed.Creator.Hex(),
			Question:       data.Question,
			EndTime:        data.EndTime.String(),
			InitialYesPred: data.InitialYesPred.String(),
			InitialNoPred:  data.InitialNoPred.String(),
			TxHash:         vLog.TxHash.Hex(),
			BlockNumber:    vLog.BlockNumber,
			Timestamp:      formatTime(),
		})
		fmt.Printf("[%s] MarketCreated marketId=%s creator=%s question=%q endTime=%s initialYesPred=%s initialNoPred=%s tx=%s\n",
			formatTime(), indexed.MarketId, indexed.Creator.Hex(), data.Question, data.EndTime, data.InitialYesPred, data.InitialNoPred, vLog.TxHash.Hex())
	case parsedABI.Events["SharesBought"].ID:
		var indexed struct {
			MarketId *big.Int
			User     common.Address
		}
		if err := abi.ParseTopics(&indexed, indexedArgs(parsedABI.Events["SharesBought"].Inputs), vLog.Topics[1:]); err != nil {
			log.Printf("SharesBought parse topics: %v", err)
			return
		}
		var data sharesBoughtData
		if err := parsedABI.UnpackIntoInterface(&data, "SharesBought", vLog.Data); err != nil {
			log.Printf("SharesBought unpack: %v", err)
			return
		}
		store.addTrade(tradeEvent{
			Type:        "buy",
			MarketId:    indexed.MarketId.String(),
			User:        indexed.User.Hex(),
			IsYes:       data.IsYes,
			PredIn:      data.PredIn.String(),
			SharesOut:   data.SharesOut.String(),
			TxHash:      vLog.TxHash.Hex(),
			BlockNumber: vLog.BlockNumber,
			Timestamp:   formatTime(),
		})
		fmt.Printf("[%s] SharesBought marketId=%s user=%s isYes=%t predIn=%s sharesOut=%s tx=%s\n",
			formatTime(), indexed.MarketId, indexed.User.Hex(), data.IsYes, data.PredIn, data.SharesOut, vLog.TxHash.Hex())
	case parsedABI.Events["SharesSold"].ID:
		var indexed struct {
			MarketId *big.Int
			User     common.Address
		}
		if err := abi.ParseTopics(&indexed, indexedArgs(parsedABI.Events["SharesSold"].Inputs), vLog.Topics[1:]); err != nil {
			log.Printf("SharesSold parse topics: %v", err)
			return
		}
		var data sharesSoldData
		if err := parsedABI.UnpackIntoInterface(&data, "SharesSold", vLog.Data); err != nil {
			log.Printf("SharesSold unpack: %v", err)
			return
		}
		store.addTrade(tradeEvent{
			Type:        "sell",
			MarketId:    indexed.MarketId.String(),
			User:        indexed.User.Hex(),
			IsYes:       data.IsYes,
			SharesIn:    data.SharesIn.String(),
			PredOut:     data.PredOut.String(),
			TxHash:      vLog.TxHash.Hex(),
			BlockNumber: vLog.BlockNumber,
			Timestamp:   formatTime(),
		})
		fmt.Printf("[%s] SharesSold marketId=%s user=%s isYes=%t sharesIn=%s predOut=%s tx=%s\n",
			formatTime(), indexed.MarketId, indexed.User.Hex(), data.IsYes, data.SharesIn, data.PredOut, vLog.TxHash.Hex())
	case parsedABI.Events["Comment"].ID:
		var indexed struct {
			MarketId *big.Int
			User     common.Address
		}
		if err := abi.ParseTopics(&indexed, indexedArgs(parsedABI.Events["Comment"].Inputs), vLog.Topics[1:]); err != nil {
			log.Printf("Comment parse topics: %v", err)
			return
		}
		var data commentData
		if err := parsedABI.UnpackIntoInterface(&data, "Comment", vLog.Data); err != nil {
			log.Printf("Comment unpack: %v", err)
			return
		}
		store.addComment(commentEvent{
			MarketId:    indexed.MarketId.String(),
			User:        indexed.User.Hex(),
			Content:     data.Content,
			TxHash:      vLog.TxHash.Hex(),
			BlockNumber: vLog.BlockNumber,
			Timestamp:   formatTime(),
		})
		fmt.Printf("[%s] Comment marketId=%s user=%s content=%q tx=%s\n",
			formatTime(), indexed.MarketId, indexed.User.Hex(), data.Content, vLog.TxHash.Hex())
	case parsedABI.Events["Danmaku"].ID:
		var indexed struct {
			MarketId *big.Int
			User     common.Address
		}
		if err := abi.ParseTopics(&indexed, indexedArgs(parsedABI.Events["Danmaku"].Inputs), vLog.Topics[1:]); err != nil {
			log.Printf("Danmaku parse topics: %v", err)
			return
		}
		var data commentData
		if err := parsedABI.UnpackIntoInterface(&data, "Danmaku", vLog.Data); err != nil {
			log.Printf("Danmaku unpack: %v", err)
			return
		}
		store.addDanmaku(danmakuEvent{
			MarketId:    indexed.MarketId.String(),
			User:        indexed.User.Hex(),
			Content:     data.Content,
			TxHash:      vLog.TxHash.Hex(),
			BlockNumber: vLog.BlockNumber,
			Timestamp:   formatTime(),
		})
		fmt.Printf("[%s] Danmaku marketId=%s user=%s content=%q tx=%s\n",
			formatTime(), indexed.MarketId, indexed.User.Hex(), data.Content, vLog.TxHash.Hex())
	default:
		log.Printf("unhandled event topic=%s tx=%s", vLog.Topics[0].Hex(), vLog.TxHash.Hex())
	}
}

func formatTime() string {
	return time.Now().Format("2006-01-02 15:04:05")
}

func indexedArgs(args abi.Arguments) abi.Arguments {
	indexed := make(abi.Arguments, 0, len(args))
	for _, arg := range args {
		if arg.Indexed {
			indexed = append(indexed, arg)
		}
	}
	return indexed
}

type marketStore struct {
	mu       sync.RWMutex
	created  map[string]marketCreatedEvent
	comments map[string][]commentEvent
	danmaku  map[string][]danmakuEvent
	trades   map[string][]tradeEvent
}

type marketCreatedEvent struct {
	MarketId       string `json:"marketId"`
	Creator        string `json:"creator"`
	Question       string `json:"question"`
	EndTime        string `json:"endTime"`
	InitialYesPred string `json:"initialYesPred"`
	InitialNoPred  string `json:"initialNoPred"`
	TxHash         string `json:"txHash"`
	BlockNumber    uint64 `json:"blockNumber"`
	Timestamp      string `json:"timestamp"`
}

type commentEvent struct {
	MarketId    string `json:"marketId"`
	User        string `json:"user"`
	Content     string `json:"content"`
	TxHash      string `json:"txHash"`
	BlockNumber uint64 `json:"blockNumber"`
	Timestamp   string `json:"timestamp"`
}

type danmakuEvent struct {
	MarketId    string `json:"marketId"`
	User        string `json:"user"`
	Content     string `json:"content"`
	TxHash      string `json:"txHash"`
	BlockNumber uint64 `json:"blockNumber"`
	Timestamp   string `json:"timestamp"`
}

type tradeEvent struct {
	Type        string `json:"type"`
	MarketId    string `json:"marketId"`
	User        string `json:"user"`
	IsYes       bool   `json:"isYes"`
	PredIn      string `json:"predIn,omitempty"`
	SharesOut   string `json:"sharesOut,omitempty"`
	SharesIn    string `json:"sharesIn,omitempty"`
	PredOut     string `json:"predOut,omitempty"`
	TxHash      string `json:"txHash"`
	BlockNumber uint64 `json:"blockNumber"`
	Timestamp   string `json:"timestamp"`
}

type marketSnapshot struct {
	Created  *marketCreatedEvent `json:"created,omitempty"`
	Comments []commentEvent      `json:"comments"`
	Danmaku  []danmakuEvent      `json:"danmaku"`
	Trades   []tradeEvent        `json:"trades"`
}

func newMarketStore() *marketStore {
	return &marketStore{
		created:  make(map[string]marketCreatedEvent),
		comments: make(map[string][]commentEvent),
		danmaku:  make(map[string][]danmakuEvent),
		trades:   make(map[string][]tradeEvent),
	}
}

func (s *marketStore) addMarketCreated(e marketCreatedEvent) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.created[e.MarketId] = e
}

func (s *marketStore) addComment(e commentEvent) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.comments[e.MarketId] = append(s.comments[e.MarketId], e)
}

func (s *marketStore) addDanmaku(e danmakuEvent) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.danmaku[e.MarketId] = append(s.danmaku[e.MarketId], e)
}

func (s *marketStore) addTrade(e tradeEvent) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.trades[e.MarketId] = append(s.trades[e.MarketId], e)
}

func (s *marketStore) getSnapshot(marketId string) marketSnapshot {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var created *marketCreatedEvent
	if value, ok := s.created[marketId]; ok {
		copyValue := value
		created = &copyValue
	}
	return marketSnapshot{
		Created:  created,
		Comments: append([]commentEvent(nil), s.comments[marketId]...),
		Danmaku:  append([]danmakuEvent(nil), s.danmaku[marketId]...),
		Trades:   append([]tradeEvent(nil), s.trades[marketId]...),
	}
}

func (s *marketStore) listCreated() []marketCreatedEvent {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]marketCreatedEvent, 0, len(s.created))
	for _, value := range s.created {
		out = append(out, value)
	}
	return out
}

func startHTTPServer(addr string, store *marketStore) *http.Server {
	if addr == "" {
		return nil
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("/markets", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/markets" {
			http.NotFound(w, r)
			return
		}
		writeJSON(w, http.StatusOK, store.listCreated())
	})
	mux.HandleFunc("/markets/", func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/markets/")
		if path == "" {
			http.NotFound(w, r)
			return
		}
		parts := strings.Split(path, "/")
		marketId := parts[0]
		if marketId == "" {
			http.NotFound(w, r)
			return
		}
		if len(parts) == 1 {
			writeJSON(w, http.StatusOK, store.getSnapshot(marketId))
			return
		}
		switch parts[1] {
		case "comments":
			writeJSON(w, http.StatusOK, store.getSnapshot(marketId).Comments)
		case "danmaku":
			writeJSON(w, http.StatusOK, store.getSnapshot(marketId).Danmaku)
		case "trades":
			writeJSON(w, http.StatusOK, store.getSnapshot(marketId).Trades)
		case "created":
			snapshot := store.getSnapshot(marketId)
			if snapshot.Created == nil {
				http.NotFound(w, r)
				return
			}
			writeJSON(w, http.StatusOK, snapshot.Created)
		default:
			http.NotFound(w, r)
		}
	})

	server := &http.Server{
		Addr:    addr,
		Handler: mux,
	}
	go func() {
		log.Printf("http server listening on %s", addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("http server error: %v", err)
		}
	}()
	return server
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
