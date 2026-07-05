# コーディングクロへの引き継ぎドキュメント

**作成日**: 2026-07-04  
**作成者**: 画像担当クロ（別タブ）  
**対象**: アプリUI実装を担当する別タブのクロ

---

## このドキュメントについて

同じリポジトリを2つのタブのクロが分担して作業しています。このドキュメントは、アプリUIの実装を担当するあなた（コーディングクロ）に、これまでの経緯と現在の状態を共有するためのものです。

---

## プロジェクト概要

**青のまなびクエスト** — 青ちゃん（小学3年生）向けの忘却曲線Webアプリ。  
語彙力UP1300（1300語）の90%定着を目標とする学習ツール。

- **公開先**: GitHub Pages（`app/` 配下のみ公開）
- **主な利用環境**: iPad
- **リポジトリ**: sayurihabuka/ao-learning-quest
- **技術スタック**: HTML / CSS / Vanilla JavaScript / Firebase Realtime Database

詳細な設計仕様は `ao-learning-quest_v1_spec.md`（親仕様書）と `CLAUDE.md`（プロジェクト設定）を参照してください。

---

## 現在のリポジトリの状態（2026-07-04 時点）

### `app/` ディレクトリ（あなたが実装する場所）

```
app/
  data/
    vocab1300.json     ← 問題データ 1300件（実装済み・変更しない）
  images/
    body_tsuchifumazu.png
    clothing_tamoto.png
    cooking_orosu.png
    counter_rabbit_wa.png
    daytime_tasogare.png
    house_kamoi.png
    manners_kasakashige.png
    old_tool_irori.png
    weather_kiri.png
    weather_oroshi.png
    weather_shinotsuku_ame.png
    （以上11件 — 試作済み画像。今後85件が追加される予定）
```

**`index.html`、`style.css`、`app.js` はまだ存在しません。あなたが作成する必要があります。**

### 問題データ `app/data/vocab1300.json`

| type | 件数 |
|---|---|
| meaning_context | 1169件 |
| image_word | 84件 |
| counter_image | 12件 |
| reading_context | 18件 |
| age_word | 5件 |
| month_hint | 12件 |
| **合計** | **1300件** |

#### `meaning_context` の例（最多タイプ）

```json
{
  "id": "vocab1300_p003_001",
  "source": "vocab1300",
  "sourcePage": 3,
  "type": "meaning_context",
  "word": "心にくい",
  "reading": "こころにくい",
  "sentence": "その子のスピーチは、言葉の選び方まで心にくいものでした。",
  "question": "心にくい の意味はどれ？",
  "choices": ["同じくらいに分けること", "夢中になること", "すぐれていて感心するようす", "よくある普通のこと"],
  "answerIndex": 2,
  "explanation": "心にくいは、にくらしいほどすぐれていて、感心してしまうようすです。",
  "image": null,
  "tags": ["vocab1300", "meaning_context", "p003"]
}
```

#### `image_word` の例（画像ありタイプ）

```json
{
  "id": "vocab1300_p014_001",
  "source": "vocab1300",
  "sourcePage": 14,
  "type": "image_word",
  "subtype": "manner_word",
  "word": "傘かしげ",
  "reading": "かさかしげ",
  "image": "images/manners_kasakashige.png",
  "hint": "すれ違うとき、傘をかたむけます。",
  "question": null,
  "choices": null,
  "answerIndex": null,
  "explanation": null,
  "tags": ["vocab1300", "image_word", "p014"]
}
```

---

## 進捗データ（Firebase Realtime Database）

1問ごとにFirebaseへ保存。途中でiPadを閉じても再開できる設計。

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

---

## 定着判定ロジック

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

---

## 画像関連の現状と予定

| 状況 | 件数 | 説明 |
|---|---:|---|
| 試作画像（app/images/済） | 11件 | すでに `app/images/` に配置・コミット済み |
| 本番プロンプト作成済み | 85件 | Google AI Studio で生成予定 |
| 本番画像（未生成） | 85件 | 画像担当クロが順次配置する |

画像は `image-prompts/vocab1300_remaining_image_prompts_v1.json` に85件分のプロンプトが記録されています。画像ファイルは今後 `app/images/` に順次追加されます。

**UIは `image` が `null` の問題と、画像ありの問題（`image_word` / `counter_image`）の両方を扱える必要があります。**

---

## 指示の出どころ

**実装指示はGP（ChatGPT）が作成します。**  
さゆりがGPと相談して仕様・指示書・設計を固め、それをクロに渡す形で進めています。

| 役割 | 担当 |
|---|---|
| 全体設計・仕様策定・指示書作成・問題作成 | GP（ChatGPT） |
| 最終判断 | さゆり |
| コード実装・JSON整形・画像処理 | Claude Code（クロ） |

実装を始める前に、GPが作成した指示書（`docs/claude_code_implementation.md` など）を必ず確認してください。自分で設計を考えるのではなく、GPの指示書に従って実装するのが基本方針です。

---

## タブ別の役割分担

| 担当 | タブ | 変更するファイル |
|---|---|---|
| 画像処理 | このドキュメントを作った別タブ | `app/images/`、`generated-images/`、`image-prompts/` |
| アプリUI実装 | あなた（コーディングクロ） | `app/index.html`、`app/style.css`、`app/app.js` |
| 最終判断 | さゆり | — |

### 共有リポジトリ運用の注意

- 作業前に必ず `git status` / `git log` を確認する
- 担当外ファイルに意図しない変更があれば勝手に上書き・コミットせず報告する
- 両タブが同じファイルを同時に編集しない

---

## 実装方針（CLAUDE.md より）

- シンプルに作る（家庭内利用、iPadでの使用を想定）
- 1問ごとにFirebaseへ進捗保存
- 途中でiPadを閉じても再開できること
- 難しい実装より、動くことを優先

---

## 絶対にコミットしてはいけないもの

- `scans/` — スキャンPDF（著作物）
- `extracted/` — 教材本文そのままの抽出データ
- `.env`、`credentials.json` — Firebase認証情報

---

## 同日やり直し機能（2026-07-05 追加）

詳細は `ao-learning-quest_v1_spec.md` セクション31を参照してください。  
ここでは実装上の要点のみ記載します。

### 概要

通常40問で△・×になった問題を、その日のうちに最大2周まで再出題する機能です。

### 1日の学習フロー

```txt
① 通常40問
②（△・×が1問以上あれば）同日やり直し・1周目
③（1周目でまだ不正解があれば）同日やり直し・2周目
④ 最後の振り返り画面
```

### 実装上の重要ルール

同日やり直しで正解しても、以下は変更しないこと。

```txt
- level
- 定着○回数（stableCorrectCount）
- nextReviewAt（△・×で設定された翌日復習をそのまま維持）
```

画面上の表示状態（今日のクリア / 2周目でクリア / 明日もう一度）は内部進捗とは別に管理します。

2周目でも不正解だった場合も、初回△・×判定時の状態をそのまま維持して終了します。同日やり直し結果による再判定はしません。翌日は通常の復習問題として出題します。

### 同日やり直しと翌日復習の違い

| 項目 | 同日やり直し | 翌日の復習 |
|---|---|---|
| 選択肢の順序 | 変更しない（同じ） | シャッフルする |
| 正解位置 | 変更しない | シャッフルにより変わる |
| levelへの影響 | なし | あり |
| 定着○判定への影響 | なし | あり |

### 進捗記録の候補フィールド

Firebaseスキーマはこの段階では確定していません。実装時に正式な設計を行うこと。

```txt
initialResult        … 通常40問での結果
sameDayRetryRound1   … 同日やり直し1周目の結果
sameDayRetryRound2   … 同日やり直し2周目の結果
sameDayFinalStatus   … cleared_round1 / cleared_round2 / retry_tomorrow
```

### 振り返り画面

2周目終了後、通常40問で△・×だった問題を全件一覧表示します。  
○だった問題は表示しません。

表示項目：語句・読み・正しい答え・簡単な解説・今日の結果

---

## 参考ドキュメント

| ファイル | 内容 |
|---|---|
| `ao-learning-quest_v1_spec.md` | 親仕様書（全設計の根拠） |
| `CLAUDE.md` | プロジェクト設定（必ず最初に読む） |
| `docs/claude_code_implementation.md` | 実装指示書（GPが作成） |
| `docs/vocab1300_question_rules.md` | 問題作成ルール |
| `app/data/vocab1300.json` | 問題データ本体（1300件） |
| `image-prompts/vocab1300_image_targets_v1.json` | 画像対象96件の一覧 |
