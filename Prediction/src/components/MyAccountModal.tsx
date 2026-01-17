import './MyAccountModal.css'

function MyAccountModal() {
  return (
    <div className="my-account-modal">
      <div className="account-header">
        <div className="account-avatar">👤</div>
        <div className="account-info">
          <h3>我的账户</h3>
          <p className="account-address">0x1234...5678</p>
        </div>
      </div>

      <div className="account-balance">
        <div className="balance-item">
          <span className="balance-label">总资产</span>
          <span className="balance-value">¥12,345.67</span>
        </div>
        <div className="balance-item">
          <span className="balance-label">可用余额</span>
          <span className="balance-value">¥10,000.00</span>
        </div>
        <div className="balance-item">
          <span className="balance-label">已投资</span>
          <span className="balance-value">¥2,345.67</span>
        </div>
      </div>

      <div className="account-actions">
        <button className="action-btn primary">充值</button>
        <button className="action-btn">提现</button>
        <button className="action-btn">交易记录</button>
      </div>

      <div className="account-stats">
        <div className="stat-item">
          <div className="stat-value">24</div>
          <div className="stat-label">参与预测</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">15</div>
          <div className="stat-label">获胜次数</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">62.5%</div>
          <div className="stat-label">胜率</div>
        </div>
      </div>
    </div>
  )
}

export default MyAccountModal
