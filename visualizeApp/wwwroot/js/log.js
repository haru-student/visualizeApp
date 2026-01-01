class LogData {
    constructor(userId, eventType, location = null, detail = null) {
        this.UserId = userId;
        this.EventType = eventType;
        this.Location = location;
        this.Detail = detail;
        this.Timestamp = new Date().toLocaleString("sv-SE", {
            timeZone: "Asia/Tokyo",
            hour12: false
        });
    }
}

export async function sendLogData(eventType, className = null, methodName = null, id = null,  detail = null) {
    let test = getCookieValue('test');
    if (test === '-1' || test === 'tmp') 
        return;

    const data = createLogEntity(eventType, className, methodName, id,  detail);

    try {
        await fetch('/Test/SaveLogData', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } catch (e) {
        console.error('ログの記録に失敗しました', data, e);
    }
}

function createLogEntity(eventType, className = null, methodName = null, id = null,  detail = null) {
    let userId = getCookieValue('userId');
    const location = (className || methodName)
        ? { Class: className, Method: methodName, NodeId: id }
        : null;
    return new LogData(userId, eventType, location, detail);
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
