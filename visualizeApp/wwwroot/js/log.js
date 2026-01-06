class LogData {
    constructor(userId, testId, testType, eventType, location = null, detail = null) {
        this.userId = userId;
        this.testId = testId;
        this.testType = testType;
        this.eventType = eventType;
        this.location = location;
        this.detail = detail;
        this.timestamp = new Date().toLocaleString("sv-SE", {
            timeZone: "Asia/Tokyo",
            hour12: false
        });
    }
}

export async function sendLogData(eventType, className = null, methodName = null, id = null,  detail = null) {
    let testId = getCookieValue('test');
    let testType = getCookieValue('type');
    if (testId === '-1' || testId === 'tmp') 
        return;

    const data = createLogEntity(testId, testType, eventType, className, methodName, id,  detail);

    try {
        await fetch('/Log/SaveLogData', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } catch (e) {
        console.error('ログの記録に失敗しました', data, e);
    }
}

function createLogEntity(testId, testType, eventType, className = null, methodName = null, id = null,  detail = null) {
    let userId = getCookieValue('userId');
    const location = (className || methodName)
        ? { Class: className, Method: methodName, NodeId: id }
        : null;
    return new LogData(userId, testId, testType, eventType, location, detail);
}

function getCookieValue(key) {
  const cookies = document.cookie.split(';');
  const foundCookie = cookies.find(
    (cookie) => cookie.split('=')[0].trim() === key.trim()
  );
  if (foundCookie) {
    const cookieValue = decodeURIComponent(foundCookie.split('=')[1])
    return cookieValue
  }
  return "-1";
}
