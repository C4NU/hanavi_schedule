import React from 'react';
import styles from './InfoModal.module.css';

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
    const [email, setEmail] = React.useState('canu1832@gmail.com');

    React.useEffect(() => {
        if (isOpen) {
            fetch('/api/settings')
                .then(res => res.json())
                .then(data => {
                    if (data.email) setEmail(data.email);
                })
                .catch(err => console.error('Failed to load settings:', err));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>&times;</button>

                <h2 className={styles.title}>하나비 스케줄 사용 가이드 💡</h2>

                <div className={styles.content}>
                    <section>
                        <h3>버튼 설명</h3>
                        <ul>
                            <li><strong>필터</strong>: 원하는 멤버의 방송만 골라볼 수 있습니다.</li>
                            <li><strong>이미지로 저장</strong>: 현재 보이는 스케줄을 이미지 파일로 저장합니다.</li>
                            <li><strong>캘린더 추가</strong>: ics 파일을 다운로드하여 내 캘린더에 일정을 등록할 수 있습니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h3>멤버 프로필 💖</h3>
                        <p>
                            스케줄표의 멤버 프로필 사진이나 이름을 누르면, 해당 멤버의 <strong>치지직 채널</strong>로 바로 이동합니다!
                        </p>
                    </section>

                    <section>
                        <h3>알림 안내 🔔</h3>
                        <p>
                            웹 앱의 특성상, 앱을 실행했을 때 최신 스케줄 정보를 불러오며 알림이 도착할 수 있습니다.
                        </p>
                    </section>

                    <section>
                        <h3>화면 모드 안내 📱💻</h3>
                        <ul>
                            <li><strong>모바일</strong>: 좌우로 스와이프하여 요일별 스케줄을 확인할 수 있습니다.</li>
                            <li><strong>데스크탑/태블릿</strong>: 일주일치 스케줄을 한눈에 볼 수 있습니다.</li>
                        </ul>
                    </section>

                    <section className={styles.contact}>
                        <h3>문의사항 📧</h3>
                        <p>
                            버그 제보나 건의사항은 아래 이메일로 보내주세요.<br />
                            <a href={`mailto:${email}`}>{email}</a>
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default InfoModal;
