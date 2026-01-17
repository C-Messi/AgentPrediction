import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './Modal.css'

interface ModalProps {
  children: React.ReactNode
  onClose: () => void
  title?: string
  className?: string
}

function Modal({ children, onClose, title, className = '' }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [onClose])

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className={`modal-content ${className}`}
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {title && (
            <div className="modal-header">
              <h2 className="modal-title">{title}</h2>
              <button className="modal-close" onClick={onClose}>
                ×
              </button>
            </div>
          )}
          <div className="modal-body">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default Modal
