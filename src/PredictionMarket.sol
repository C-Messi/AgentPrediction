// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract PredictionMarket is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    enum MarketStatus {
        Active,
        Resolved,
        Cancelled
    }

    struct Market {
        uint256 id;
        address creator;
        string question;
        uint256 endTime;
        MarketStatus status;
        bool outcome;
        uint256 yesPredReserve;
        uint256 yesShareReserve;
        uint256 noPredReserve;
        uint256 noShareReserve;
        uint256 totalYesShares;
        uint256 totalNoShares;
        uint256 winningPredPool;
        uint256 totalWinningShares;
    }

    struct Position {
        uint128 yesShares;
        uint128 noShares;
        bool claimed;
        bool refunded;
    }

    uint256 public constant MIN_TRADE = 1e15;
    uint256 public constant INITIAL_SHARE_RESERVE = 1_000_000e18;
    uint256 public constant VIRTUAL_PRED_RESERVE = 1_000e18;
    uint256 public constant MAX_COMMENT_LENGTH = 280;
    uint256 public constant MAX_DANMAKU_LENGTH = 120;

    IERC20 public immutable predToken;
    uint256 public marketCount;
    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Position)) public positions;
    mapping(address => bool) public agents;

    event MarketCreated(
        uint256 indexed marketId,
        address indexed creator,
        string question,
        uint256 endTime,
        uint256 initialYesPred,
        uint256 initialNoPred
    );
    event SharesBought(
        uint256 indexed marketId,
        address indexed user,
        bool isYes,
        uint256 predIn,
        uint256 sharesOut
    );
    event SharesSold(
        uint256 indexed marketId,
        address indexed user,
        bool isYes,
        uint256 sharesIn,
        uint256 predOut
    );
    event MarketResolved(uint256 indexed marketId, bool outcome);
    event MarketCancelled(uint256 indexed marketId);
    event WinningsClaimed(
        uint256 indexed marketId,
        address indexed user,
        uint256 amount
    );
    event Refunded(uint256 indexed marketId, address indexed user, uint256 amount);
    event Comment(uint256 indexed marketId, address indexed user, string content);
    event Danmaku(uint256 indexed marketId, address indexed user, string content);
    event AgentUpdated(address indexed agent, bool enabled);

    modifier onlyAgent() {
        require(agents[msg.sender], "Agent only");
        _;
    }

    constructor(IERC20 predToken_) Ownable(msg.sender) {
        require(address(predToken_) != address(0), "Pred token required");
        predToken = predToken_;
    }

    function setAgent(address agent, bool enabled) external onlyOwner {
        agents[agent] = enabled;
        emit AgentUpdated(agent, enabled);
    }

    function createMarket(
        string calldata question,
        uint256 endTime,
        uint256 initialYesPred,
        uint256 initialNoPred
    ) external onlyAgent returns (uint256) {
        require(endTime > block.timestamp, "End time in past");
        require(initialYesPred > 0 && initialNoPred > 0, "Init liquidity required");

        uint256 marketId = ++marketCount;
        markets[marketId] = Market({
            id: marketId,
            creator: msg.sender,
            question: question,
            endTime: endTime,
            status: MarketStatus.Active,
            outcome: false,
            yesPredReserve: initialYesPred,
            yesShareReserve: INITIAL_SHARE_RESERVE,
            noPredReserve: initialNoPred,
            noShareReserve: INITIAL_SHARE_RESERVE,
            totalYesShares: 0,
            totalNoShares: 0,
            winningPredPool: 0,
            totalWinningShares: 0
        });

        predToken.safeTransferFrom(
            msg.sender,
            address(this),
            initialYesPred + initialNoPred
        );

        emit MarketCreated(
            marketId,
            msg.sender,
            question,
            endTime,
            initialYesPred,
            initialNoPred
        );
        return marketId;
    }

    function resolveMarket(uint256 marketId, bool outcome) external onlyAgent {
        Market storage market = markets[marketId];
        require(market.id != 0, "Market not found");
        require(market.status == MarketStatus.Active, "Market not active");
        require(block.timestamp >= market.endTime, "Market not ended");

        market.status = MarketStatus.Resolved;
        market.outcome = outcome;
        market.winningPredPool = market.yesPredReserve + market.noPredReserve;
        market.totalWinningShares = outcome
            ? market.totalYesShares
            : market.totalNoShares;

        market.yesPredReserve = 0;
        market.noPredReserve = 0;
        market.yesShareReserve = 0;
        market.noShareReserve = 0;

        emit MarketResolved(marketId, outcome);
    }

    function cancelMarket(uint256 marketId) external onlyAgent {
        Market storage market = markets[marketId];
        require(market.id != 0, "Market not found");
        require(market.status == MarketStatus.Active, "Market not active");
        market.status = MarketStatus.Cancelled;
        emit MarketCancelled(marketId);
    }

    function buyYes(
        uint256 marketId,
        uint256 predIn,
        uint256 minSharesOut
    ) external nonReentrant returns (uint256 sharesOut) {
        Market storage market = markets[marketId];
        _requireActive(market);
        require(predIn >= MIN_TRADE, "Trade too small");

        predToken.safeTransferFrom(msg.sender, address(this), predIn);

        (uint256 newPredReserve, uint256 newShareReserve, uint256 outShares) =
            _buyShares(market.yesPredReserve, market.yesShareReserve, predIn);
        require(outShares >= minSharesOut, "Slippage");
        require(outShares <= market.yesShareReserve, "Insufficient shares");

        market.yesPredReserve = newPredReserve;
        market.yesShareReserve = newShareReserve;
        market.totalYesShares += outShares;

        Position storage position = positions[marketId][msg.sender];
        require(outShares <= type(uint128).max, "Share overflow");
        position.yesShares += uint128(outShares);

        emit SharesBought(marketId, msg.sender, true, predIn, outShares);
        return outShares;
    }

    function buyNo(
        uint256 marketId,
        uint256 predIn,
        uint256 minSharesOut
    ) external nonReentrant returns (uint256 sharesOut) {
        Market storage market = markets[marketId];
        _requireActive(market);
        require(predIn >= MIN_TRADE, "Trade too small");

        predToken.safeTransferFrom(msg.sender, address(this), predIn);

        (uint256 newPredReserve, uint256 newShareReserve, uint256 outShares) =
            _buyShares(market.noPredReserve, market.noShareReserve, predIn);
        require(outShares >= minSharesOut, "Slippage");
        require(outShares <= market.noShareReserve, "Insufficient shares");

        market.noPredReserve = newPredReserve;
        market.noShareReserve = newShareReserve;
        market.totalNoShares += outShares;

        Position storage position = positions[marketId][msg.sender];
        require(outShares <= type(uint128).max, "Share overflow");
        position.noShares += uint128(outShares);

        emit SharesBought(marketId, msg.sender, false, predIn, outShares);
        return outShares;
    }

    function sellYes(
        uint256 marketId,
        uint256 sharesIn,
        uint256 minPredOut
    ) external nonReentrant returns (uint256 predOut) {
        Market storage market = markets[marketId];
        _requireActive(market);
        require(sharesIn > 0, "Zero shares");

        Position storage position = positions[marketId][msg.sender];
        require(position.yesShares >= sharesIn, "Not enough shares");

        (uint256 newPredReserve, uint256 newShareReserve, uint256 outPred) =
            _sellShares(market.yesPredReserve, market.yesShareReserve, sharesIn);
        require(outPred >= minPredOut, "Slippage");

        market.yesPredReserve = newPredReserve;
        market.yesShareReserve = newShareReserve;
        market.totalYesShares -= sharesIn;
        position.yesShares -= uint128(sharesIn);

        predToken.safeTransfer(msg.sender, outPred);
        emit SharesSold(marketId, msg.sender, true, sharesIn, outPred);
        return outPred;
    }

    function sellNo(
        uint256 marketId,
        uint256 sharesIn,
        uint256 minPredOut
    ) external nonReentrant returns (uint256 predOut) {
        Market storage market = markets[marketId];
        _requireActive(market);
        require(sharesIn > 0, "Zero shares");

        Position storage position = positions[marketId][msg.sender];
        require(position.noShares >= sharesIn, "Not enough shares");

        (uint256 newPredReserve, uint256 newShareReserve, uint256 outPred) =
            _sellShares(market.noPredReserve, market.noShareReserve, sharesIn);
        require(outPred >= minPredOut, "Slippage");

        market.noPredReserve = newPredReserve;
        market.noShareReserve = newShareReserve;
        market.totalNoShares -= sharesIn;
        position.noShares -= uint128(sharesIn);

        predToken.safeTransfer(msg.sender, outPred);
        emit SharesSold(marketId, msg.sender, false, sharesIn, outPred);
        return outPred;
    }

    function claimWinnings(uint256 marketId) external nonReentrant {
        Market storage market = markets[marketId];
        require(market.id != 0, "Market not found");
        require(market.status == MarketStatus.Resolved, "Market not resolved");
        require(market.totalWinningShares > 0, "No winners");

        Position storage position = positions[marketId][msg.sender];
        require(!position.claimed, "Already claimed");

        uint256 userShares = market.outcome
            ? uint256(position.yesShares)
            : uint256(position.noShares);
        require(userShares > 0, "No winnings");

        position.claimed = true;
        if (market.outcome) {
            position.yesShares = 0;
        } else {
            position.noShares = 0;
        }

        uint256 payout =
            (userShares * market.winningPredPool) / market.totalWinningShares;
        predToken.safeTransfer(msg.sender, payout);
        emit WinningsClaimed(marketId, msg.sender, payout);
    }

    function refund(uint256 marketId) external nonReentrant {
        Market storage market = markets[marketId];
        require(market.id != 0, "Market not found");
        require(market.status == MarketStatus.Cancelled, "Market not cancelled");

        Position storage position = positions[marketId][msg.sender];
        require(!position.refunded, "Already refunded");

        uint256 yesShares = uint256(position.yesShares);
        uint256 noShares = uint256(position.noShares);
        require(yesShares > 0 || noShares > 0, "Nothing to refund");

        position.refunded = true;
        position.yesShares = 0;
        position.noShares = 0;

        uint256 predOutTotal = 0;
        if (yesShares > 0) {
            (uint256 newPredReserve, uint256 newShareReserve, uint256 predOut) =
                _sellShares(market.yesPredReserve, market.yesShareReserve, yesShares);
            market.yesPredReserve = newPredReserve;
            market.yesShareReserve = newShareReserve;
            market.totalYesShares -= yesShares;
            predOutTotal += predOut;
        }

        if (noShares > 0) {
            (uint256 newPredReserve, uint256 newShareReserve, uint256 predOut) =
                _sellShares(market.noPredReserve, market.noShareReserve, noShares);
            market.noPredReserve = newPredReserve;
            market.noShareReserve = newShareReserve;
            market.totalNoShares -= noShares;
            predOutTotal += predOut;
        }

        predToken.safeTransfer(msg.sender, predOutTotal);
        emit Refunded(marketId, msg.sender, predOutTotal);
    }

    function sendDanmaku(uint256 marketId, string calldata content) external {
        Market storage market = markets[marketId];
        require(market.id != 0, "Market not found");
        require(bytes(content).length <= MAX_DANMAKU_LENGTH, "Content too long");
        emit Danmaku(marketId, msg.sender, content);
    }

    function sendComment(uint256 marketId, string calldata content) external {
        Market storage market = markets[marketId];
        require(market.id != 0, "Market not found");
        require(bytes(content).length <= MAX_COMMENT_LENGTH, "Content too long");
        emit Comment(marketId, msg.sender, content);
    }

    function getMarketBasics(
        uint256 marketId
    )
        external
        view
        returns (
            address creator,
            string memory question,
            uint256 endTime,
            MarketStatus status,
            bool outcome
        )
    {
        Market storage market = markets[marketId];
        require(market.id != 0, "Market not found");
        return (
            market.creator,
            market.question,
            market.endTime,
            market.status,
            market.outcome
        );
    }

    function getMarketPools(
        uint256 marketId
    )
        external
        view
        returns (
            uint256 yesPredReserve,
            uint256 yesShareReserve,
            uint256 noPredReserve,
            uint256 noShareReserve,
            uint256 totalYesShares,
            uint256 totalNoShares,
            uint256 winningPredPool,
            uint256 totalWinningShares
        )
    {
        Market storage market = markets[marketId];
        require(market.id != 0, "Market not found");
        return (
            market.yesPredReserve,
            market.yesShareReserve,
            market.noPredReserve,
            market.noShareReserve,
            market.totalYesShares,
            market.totalNoShares,
            market.winningPredPool,
            market.totalWinningShares
        );
    }

    function _requireActive(Market storage market) internal view {
        require(market.id != 0, "Market not found");
        require(market.status == MarketStatus.Active, "Market not active");
        require(block.timestamp < market.endTime, "Market ended");
    }

    function _buyShares(
        uint256 predReserve,
        uint256 shareReserve,
        uint256 predIn
    )
        internal
        pure
        returns (uint256 newPredReserve, uint256 newShareReserve, uint256 sharesOut)
    {
        require(shareReserve > 0, "Empty pool");
        uint256 k = (predReserve + VIRTUAL_PRED_RESERVE) * shareReserve;
        newPredReserve = predReserve + predIn;
        newShareReserve = k / (newPredReserve + VIRTUAL_PRED_RESERVE);
        require(newShareReserve < shareReserve, "No shares out");
        sharesOut = shareReserve - newShareReserve;
    }

    function _sellShares(
        uint256 predReserve,
        uint256 shareReserve,
        uint256 sharesIn
    )
        internal
        pure
        returns (uint256 newPredReserve, uint256 newShareReserve, uint256 predOut)
    {
        require(shareReserve > 0, "Empty pool");
        uint256 k = (predReserve + VIRTUAL_PRED_RESERVE) * shareReserve;
        newShareReserve = shareReserve + sharesIn;
        uint256 nextPredWithVirtual = k / newShareReserve;
        require(nextPredWithVirtual > VIRTUAL_PRED_RESERVE, "Insufficient liquidity");
        newPredReserve = nextPredWithVirtual - VIRTUAL_PRED_RESERVE;
        require(newPredReserve < predReserve, "No pred out");
        predOut = predReserve - newPredReserve;
    }
}
