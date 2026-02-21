class LogData {
    constructor(uniqueId, userId, testId, testType, eventType, location = null, detail = null) {
        this.uniqueId = uniqueId;
        this.userId = userId;
        this.testId = testId;
        this.testType = testType;
        this.eventType = eventType;
        this.location = location;
        this.detail = detail;
        this.timestamp = new Date().toISOString();
    }
}

export async function sendLogData(eventType, className = null, methodName = null, id = null,  detail = null) {
    let testId = getCookieValue('test');
    let testType = getCookieValue('type');
    if (testId === '-1' || testId === 'tmp') 
        return;

    let uniqueId = getCookieValue('uniqueId');

    const data = createLogEntity(uniqueId, testId, testType, eventType, className, methodName, id,  detail);
    try {
        await fetch('https://viz-app-cfbsfgc4gwbscygs.japanwest-01.azurewebsites.net/Log/SaveLogData', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } catch (e) {
        saveFallbackAnswer(data);
    }
}

function createLogEntity(uniqueId, testId, testType, eventType, className = null, methodName = null, id = null,  detail = null) {
    let userId = getCookieValue('userId');
    const location = (className || methodName)
        ? { Class: className, Method: methodName, NodeId: id }
        : null;
    return new LogData(uniqueId, userId, testId, testType, eventType, location, detail);
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

function saveFallbackAnswer(data) {
    if (data.eventType === 'start' || data.eventType === 'submit') {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        const fallback = {
            uniqueId: data.uniqueId,
            userId: data.userId,
            testId: data.testId,
            testType: data.testType,
            eventType: data.eventType,
            detail: data.detail,   
            timestamp: data.timestamp,
            expiresAt
        };

        localStorage.setItem(`${fallback.testId}.${fallback.eventType}`, JSON.stringify(fallback));
    }
}

