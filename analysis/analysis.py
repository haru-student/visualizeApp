import csv
import json
from collections import defaultdict

def analyze_csv():
    # ===== ファイル名入力 =====
    filename = input("分析するCSVファイル名を入力してください: ")

    # ===== 初期化 =====
    list1 = []  # location と duration
    list2 = []  # location と detail
    transitions = {}  # 遷移パターン

    current_location = "callGraph"
    current_time = ""

    # ===== CSV 読み込み =====
    with open(f"data/{filename}", newline="", encoding="cp932") as f:
        reader = csv.DictReader(f)

        for row in reader:
            event_type = row["eventType"]
            time = float(row["time"])

            # --- start ---
            if event_type == "start":
                current_time = time

            # --- openPAD ---
            elif event_type == "openPAD":
                duration = time - current_time
                list1.append({
                    "location": normalize_location(current_location),
                    "duration": duration
                })

                # 状態更新
                current_location = row.get("location", "callGraph")
                current_time = time

            # --- closePAD ---
            elif event_type == "closePAD":
                duration = time - current_time
                list1.append({
                    "location": normalize_location(current_location),
                    "duration": duration
                })

                # 状態更新
                current_location = "callGraph"
                current_time = time

            # --- submit ---
            elif event_type == "submit":
                duration = time - current_time
                list1.append({
                    "location": normalize_location(current_location),
                    "duration": duration
                })
                break
                # location, time は更新しない

            # --- updateMemo ---
            elif event_type == "updateMemo":
                list2.append({
                    "location": current_location,
                    "detail": row.get("detail", "")
                })

    # ===== 遷移パターン集計 =====
    for i in range(1, len(list1)):
        prev_loc = list1[i - 1]["location"]
        curr_loc = list1[i]["location"]
        key = f"{prev_loc} -> {curr_loc}"

        if key not in transitions:
            transitions[key] = 0
        transitions[key] += 1

    # ===== 集計用 =====
    total_time = defaultdict(float)
    counts = defaultdict(int)

    # ===== 集計 =====
    for item in list1:
        loc = item["location"]
        dur = item["duration"]

        total_time[loc] += dur
        counts[loc] += 1

    # ===== 出力 =====
    print("\n=== Location Stats ===")

    for loc in total_time:
        total = total_time[loc]
        count = counts[loc]
        avg = total / count

        print(f"{loc}")
        print(f"  合計滞在時間: {total:.2f} 秒")
        print(f"  平均滞在時間: {avg:.2f} 秒")
        print(f"  回数: {count}")

    # ===== 出力 =====
    print("\n=== List1 (location × duration) ===")
    for item in list1:
        print(item)

    print("\n=== List2 (memo updates) ===")
    for item in list2:
        print(item)

    print("\n=== Transition Patterns ===")
    for k, v in transitions.items():
        print(f"{k}: {v}")



def normalize_location(raw_location: str) -> str:
    """
    location が JSON なら Method 名だけ返す
    callGraph はそのまま返す
    """
    if raw_location == "callGraph":
        return "callGraph"

    try:
        data = json.loads(raw_location)
        return data.get("Method", raw_location)
    except json.JSONDecodeError:
        # JSON じゃなかった場合の保険
        return raw_location
    
if __name__ == "__main__":
    analyze_csv()
