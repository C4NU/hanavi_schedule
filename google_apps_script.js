/**
 * 하나비 스케줄 알림용 구글 Apps Script
 * 
 * 사용법:
 * 1. 구글 시트를 엽니다.
 * 2. 상단 메뉴 [확장 프로그램] > [Apps Script]로 들어갑니다.
 * 3. 이 코드를 복사해서 붙여넣으세요.
 * 4. 아래 CONFIG 객체 내용을 자신의 환경에 맞게 수정하세요.
 * 5. `setupTrigger` 함수를 한번 실행하여 트리거를 초기화하세요.
 */
const CONFIG = {
    // 배포된 Vercel 도메인 주소로 변경하세요
    WEBHOOK_URL: 'https://your-app-domain.vercel.app/api/webhook/schedule-update',
    // .env.local에 있는 ADMIN_SECRET 값과 동일하게 설정하세요
    ADMIN_SECRET: 'YOUR_ADMIN_SECRET_HERE',
    // 감지할 시트(탭)의 이름입니다
    TARGET_SHEET_NAME: 'Schedule',
    // 시간 기반 트리거 사용 시 체크 주기 (분 단위)
    CHECK_INTERVAL_MINUTES: 5
};
function setupTrigger() {
    // 기존 트리거 제거 (중복 방지)
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(t => ScriptApp.deleteTrigger(t));
    // 변경 감지(onChange) 트리거 생성
    ScriptApp.newTrigger('checkAndUpdate')
        .forSpreadsheet(SpreadsheetApp.getActive())
        .onChange()
        .create();
    Logger.log('트리거가 성공적으로 설정되었습니다.');
}
function checkAndUpdate(e) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.TARGET_SHEET_NAME);
    if (!sheet) {
        Logger.log('대상 시트를 찾을 수 없습니다.');
        return;
    }
    // 1. 현재 데이터 가져오기
    const data = sheet.getDataRange().getValues();
    // 1-1. 주간 날짜 범위 감지 (B1 셀)
    const currentWeekRange = (data[0] && data[0][1]) ? data[0][1].toString() : '';
    // 1-2. 멤버별 데이터 그룹화 및 해시 계산
    const memberData = {};
    const currentMemberHashes = {};
    // 데이터는 4행(인덱스 3)부터 시작
    for (let i = 3; i < data.length; i++) {
        const row = data[i];
        const charId = row[0]; // 첫 번째 열이 캐릭터 ID라고 가정
        if (!charId) continue;
        if (!memberData[charId]) {
            memberData[charId] = [];
        }
        // 해당 멤버의 스케줄 행 추가
        memberData[charId].push(row);
    }
    // 각 멤버별 해시 계산
    for (const charId in memberData) {
        currentMemberHashes[charId] = computeHash_(JSON.stringify(memberData[charId]));
    }
    // 2. 저장된 상태 가져오기
    const props = PropertiesService.getScriptProperties();
    const lastWeekRange = props.getProperty('LAST_WEEK_RANGE');
    const lastMemberHashesJson = props.getProperty('LAST_MEMBER_HASHES');
    const lastMemberHashes = lastMemberHashesJson ? JSON.parse(lastMemberHashesJson) : {};
    // 이름 매핑 (ID -> 한글 표시명)
    // 필요하면 시트의 프로필 탭에서 읽어올 수도 있지만, 하드코딩이 빠르고 안전할 수 있음
    const memberNamemap = {
        'varessa': '바레사',
        'nemu': '네무',
        'maroka': '마로카',
        'mirai': '미라이',
        'ruvi': '루비',
        'iriya': '이리야'
    };
    let title = '';
    let body = '';
    let shouldNotify = false;
    // 3. 변경 유형 분석
    // Case A: 주간 범위 변경 (새로운 스케줄)
    if (currentWeekRange && currentWeekRange !== lastWeekRange) {
        title = `📅 ${currentWeekRange} 주간 스케줄`;
        body = '새로운 주간 스케줄이 등록되었습니다!';
        shouldNotify = true;
        Logger.log('유형: 새로운 주간 스케줄');
        // 상태 업데이트
        props.setProperty('LAST_WEEK_RANGE', currentWeekRange);
        // 새 주간이 시작되면 멤버 해시도 현재 상태로 모두 갱신 (알림 중복 방지)
        props.setProperty('LAST_MEMBER_HASHES', JSON.stringify(currentMemberHashes));
    } else {
        // Case B: 개별 멤버 수정
        const changedMembers = [];
        for (const charId in currentMemberHashes) {
            if (currentMemberHashes[charId] !== lastMemberHashes[charId]) {
                // 기존에 데이터가 있었던 경우에만 '수정'으로 간주 (아예 처음 추가는 제외하거나 포함할지 결정)
                // 여기서는 단순 변경 감지
                const name = memberNamemap[charId] || charId;
                changedMembers.push(name);
            }
        }
        if (changedMembers.length > 0) {
            shouldNotify = true;
            if (changedMembers.length === 1) {
                title = `✨ ${changedMembers[0]} 스케줄 수정`;
                body = `${changedMembers[0]}님의 스케줄이 변경되었습니다. 확인해보세요!`;
            } else {
                const first = changedMembers[0];
                const count = changedMembers.length - 1;
                title = '✨ 스케줄 수정 알림';
                body = `${first}님 외 ${count}명의 스케줄이 변경되었습니다.`;
            }
            Logger.log('유형: 멤버 개별 수정 - ' + changedMembers.join(', '));
            // 변경된 멤버 해시만 업데이트 (부분 업데이트가 안되므로 전체 덮어쓰기)
            props.setProperty('LAST_MEMBER_HASHES', JSON.stringify(currentMemberHashes));
        }
    }
    // 4. 알림 발송
    if (shouldNotify) {
        try {
            sendWebhookNotification(title, body);
        } catch (err) {
            Logger.log('알림 발송 실패: ' + err);
        }
    } else {
        Logger.log('변경사항 없음.');
    }
}
function sendWebhookNotification(title, body) {
    const payload = {
        secret: CONFIG.ADMIN_SECRET,
        timestamp: new Date().toISOString(),
        title: title,
        body: body
    };
    const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload)
    };
    const response = UrlFetchApp.fetch(CONFIG.WEBHOOK_URL, options);
    Logger.log('Webhook 응답: ' + response.getContentText());
}
/**
 * 변경 감지를 위한 간단한 해시 계산 함수 (MD5 사용)
 */
function computeHash_(input) {
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, input);
    let txtHash = '';
    for (let i = 0; i < digest.length; i++) {
        let hashVal = digest[i];
        if (hashVal < 0) hashVal += 256;
        if (hashVal.toString(16).length == 1) txtHash += '0';
        txtHash += hashVal.toString(16);
    }
    return txtHash;
}