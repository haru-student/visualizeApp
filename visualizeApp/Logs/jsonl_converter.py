import json
import csv
import sys
import os

# ログファイル名
INPUT_FILENAME = 'operation-log.jsonl'
# 出力ファイル名
OUTPUT_FILENAME = 'operation-log.csv'

def jsonl_to_csv(input_file, output_file):
    data_list = []
    
    # 1. JSONLを読み込み（UTF-8）
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    try:
                        record = json.loads(line)
                        data_list.append(record)
                    except json.JSONDecodeError as e:
                        print(f"JSONデコードエラー: {e} - 行: {line.strip()}", file=sys.stderr)
                        continue
    except FileNotFoundError:
        print(f"エラー: ファイル '{input_file}' が見つかりません。", file=sys.stderr)
        return

    if not data_list:
        print("処理するデータがありません。", file=sys.stderr)
        return
        
    # 2. ヘッダーを決定
    fieldnames = ['UserId', 'EventType', 'Timestamp', 'Location.Class', 'Location.Method', 'Location.NodeId']
    
    detail_keys = set()
    for record in data_list:
        if 'Detail' in record and record['Detail'] is not None and isinstance(record['Detail'], dict):
            detail_keys.update(record['Detail'].keys())
                
    fieldnames.extend(sorted(list(detail_keys)))
    
    # 3. CSVを書き込み（日本語対応: UTF-8 BOM付き）
    try:
        # encoding='utf-8-sig' で BOM付きUTF-8 を指定し、Excelでの文字化けを防ぎます。
        with open(output_file, 'w', encoding='utf-8-sig', newline='') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            for record in data_list:
                row = {}
                
                # 基本フィールドとLocationを展開
                row['UserId'] = record.get('UserId')
                row['EventType'] = record.get('EventType')
                row['Timestamp'] = record.get('Timestamp')
                
                location = record.get('Location')
                if location and isinstance(location, dict):
                    row['Location.Class'] = location.get('Class')
                    row['Location.Method'] = location.get('Method')
                    row['Location.NodeId'] = location.get('NodeId')
                    
                # Detailを展開
                detail = record.get('Detail')
                if detail and isinstance(detail, dict):
                    for key, value in detail.items():
                        row[key] = value # Detail内のキーをCSV列として使用
                
                writer.writerow(row)
                
        print(f"✅ 正常に変換されました。'{output_file}' を確認してください。")

    except Exception as e:
        print(f"CSVファイルの書き込み中にエラーが発生しました: {e}", file=sys.stderr)

if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(script_dir, INPUT_FILENAME)
    output_path = os.path.join(script_dir, OUTPUT_FILENAME)
    
    jsonl_to_csv(input_path, output_path)