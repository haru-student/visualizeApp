class LogData {
    constructor(userId, eventType, location = null, detail = null) {
        this.UserId = userId;
        this.EventType = eventType;
        this.Location = location;
        this.Detail = detail;
        this.Timestamp = new Date().toLocaleString("ja-JP", { 
            timeZone: "Asia/Tokyo" 
        });
    }
}

export async function sendLogData(userId, eventType, className = null, methodName = null, id = null,  detail = null) {

    const data = createLogEntity(userId, eventType, className, methodName, id,  detail);

    console.log("Send Log:", data);

    try {
        await fetch('/Home/SaveLog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } catch (e) {
        console.error('ログの記録に失敗しました', data, e);
    }
}

function createLogEntity(userId, eventType, className = null, methodName = null, id = null,  detail = null) {
    const location = (className || methodName)
        ? { Class: className, Method: methodName, NodeId: id }
        : null;
    return new LogData(userId, eventType, location, detail);
}