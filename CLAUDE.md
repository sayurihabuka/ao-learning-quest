# ao-learning-quest — Claude Code プロジェクト設定

## プロジェクト概要

**青のまなびクエスト** — 青ちゃん（小3）向けの忘却曲線Web学習ツール。  
v1対象教材：語彙力UP1300（1300語の90%定着を目標）

## ディレクトリ構成

```
ao-learning-quest/
  ao-learning-quest_v1_spec.md   # 親仕様書（全設計の根拠）
  CLAUDE.md
  README.md

  docs/
    vocab1300_question_rules.md         # 問題作成ルール（GPが作成）
    vocab1300_question_prompt_template.md
    vocab_image_generation_rules.md     # 画像生成ルール
    claude_code_implementation.md       # 実装指示書（GPが作成）

  scans/vocab1300/          # スキャンPDF（非公開・コミット禁止）
  extracted/                # 抽出CSV（非公開・コミット禁止）
  questions/                # 問題JSON（作業用）
  image-prompts/            # 画像生成プロンプトCSV
  generated-images/         # 生成画像（採用前のストック）

  app/                      # GitHub Pages公開対象（ここだけ公開）
    index.html
    style.css
    app.js
    data/vocab1300.json
    images/
```

## 技術構成

- **フロントエンド**: HTML / CSS / Vanilla JavaScript
- **データ**: JSON（問題）+ Firebase Realtime Database（進捗のみ）
- **公開**: GitHub Pages（`app/` 配下のみ）

## 役割分担

| 作業 | 担当 |
|---|---|
| コード実装 | Claude Code（あなた） |
| JSON整形・配置補助 | Claude Code |
| 全体設計・指示書作成・問題作成 | ChatGPT（GP） |
| 最終判断 | さゆり |

## 実装時の重要ルール

### 問題JSON形式

```json
{
  "id": "vocab1300_p012_001",
  "source": "vocab1300",
  "sourcePage": 12,
  "type": "meaning_context",
  "word": "口下手",
  "reading": "くちべた",
  "sentence": "...",
  "question": "口下手 の意味はどれ？",
  "choices": ["...", "...", "...", "..."],
  "answerIndex": 2,
  "explanation": "...",
  "image": null,
  "tags": ["vocab1300", "meaning_context"]
}
```

### 進捗データ（Firebase）

```json
{
  "level": 2,
  "mark": "circle",
  "correctCount": 3,
  "wrongCount": 1,
  "unsureCount": 2,
  "streak": 1,
  "firstAnsweredAt": 1760000000000,
  "lastAnsweredAt": 1760000000000,
  "nextReviewAt": 1760259200000,
  "stableCorrectCount": 2,
  "isMastered": true
}
```

### 定着判定ロジック

```
isMastered = (日をまたいで2回以上○) AND (level >= 2)
```

### 忘却曲線（復習間隔）

| level | 次回復習 |
|---:|---:|
| 0 | 翌日 |
| 1 | 3日後 |
| 2 | 7日後 |
| 3 | 14日後 |
| 4 | 30日後 |
| 5 | 60日後 |

### 判定ルール

| 結果 | 処理 |
|---|---|
| ○（自動） | level+1, correctCount+1, streak+1, nextReviewAt更新 |
| △（自己申告） | levelそのまま, unsureCount+1, nextReviewAt=翌日 |
| ×（自動） | level-1（0未満にしない）, wrongCount+1, streak=0, nextReviewAt=翌日 |

### 1日の出題ルール

| 前日の△×数 | 今日の出題 |
|---:|---|
| 0〜9語 | 新規35問＋復習5問 |
| 10〜19語 | 新規30問＋復習10問 |
| 20語以上 | 新規20問＋復習20問 |

## 絶対に公開・コミットしてはいけないもの

- `scans/` — スキャンPDF（著作物）
- `extracted/` — 教材本文そのままの抽出データ
- `.env`, `credentials.json` — Firebase認証情報

## コーディング方針

- シンプルに作る（家庭内利用、iPadでの使用を想定）
- 1問ごとにFirebaseへ進捗保存
- 途中でiPadを閉じても再開できること
- 難しい実装より、動くことを優先
