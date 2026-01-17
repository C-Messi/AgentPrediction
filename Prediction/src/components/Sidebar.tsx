import './Sidebar.css'

interface SidebarProps {
  onItemClick: (type: string) => void
}

function Sidebar({ onItemClick }: SidebarProps) {
  return (
    <div className="sidebar">
      <div className="sidebar-item" onClick={() => onItemClick('following')}>
        <span className="sidebar-text">关注</span>
        <span className="sidebar-dot">·</span>
      </div>
      <div className="sidebar-item" onClick={() => onItemClick('friends')}>
        <span className="sidebar-text">朋友</span>
      </div>
      <div className="sidebar-item" onClick={() => onItemClick('my')}>
        <span className="sidebar-text">我的</span>
      </div>
    </div>
  )
}

export default Sidebar
