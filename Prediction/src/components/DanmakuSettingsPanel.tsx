import './DanmakuSettingsPanel.css'

interface DanmakuSettingsPanelProps {
  displayArea: number
  onDisplayAreaChange: (area: number) => void
}

function DanmakuSettingsPanel({ displayArea, onDisplayAreaChange }: DanmakuSettingsPanelProps) {
  return (
    <div className="danmaku-settings-panel">
      <div className="danmaku-display-area-control">
        <label className="display-area-label">显示区域</label>
        <div className="display-area-slider-container">
          <input
            type="range"
            className="display-area-slider"
            min="0"
            max="100"
            value={displayArea}
            onChange={(e) => onDisplayAreaChange(Number(e.target.value))}
            step="5"
          />
          <span className="display-area-value">{displayArea}%</span>
        </div>
        <div className="display-area-quick-btns">
          <button
            className={`quick-btn ${displayArea === 100 ? 'active' : ''}`}
            onClick={() => onDisplayAreaChange(100)}
          >
            满屏
          </button>
          <button
            className={`quick-btn ${displayArea === 50 ? 'active' : ''}`}
            onClick={() => onDisplayAreaChange(50)}
          >
            半屏
          </button>
          <button
            className={`quick-btn ${displayArea === 25 ? 'active' : ''}`}
            onClick={() => onDisplayAreaChange(25)}
          >
            1/4屏
          </button>
          <button
            className={`quick-btn ${displayArea === 0 ? 'active' : ''}`}
            onClick={() => onDisplayAreaChange(0)}
          >
            关
          </button>
        </div>
      </div>
    </div>
  )
}

export default DanmakuSettingsPanel
