import React, { useState, useEffect } from 'react';
import styles from './YouTubeLinkModal.module.css';

interface YouTubeLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (url: string) => void;
    initialUrl?: string;
}

const YouTubeLinkModal: React.FC<YouTubeLinkModalProps> = ({ isOpen, onClose, onSave, initialUrl = '' }) => {
    const [url, setUrl] = useState(initialUrl);

    useEffect(() => {
        if (isOpen) {
            setUrl(initialUrl || '');
        }
    }, [isOpen, initialUrl]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(url);
        onClose();
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h3 className={styles.title}>유튜브 링크 연결</h3>
                <form onSubmit={handleSubmit} className={styles.inputGroup}>
                    <label className={styles.inputLabel}>동영상 URL 입력</label>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="https://youtu.be/..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        autoFocus
                    />
                    <div className={styles.buttonGroup}>
                        <button type="button" className={`${styles.button} ${styles.cancelButton}`} onClick={onClose}>
                            취소
                        </button>
                        <button type="submit" className={`${styles.button} ${styles.saveButton}`}>
                            저장
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default YouTubeLinkModal;
