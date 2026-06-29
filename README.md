# 青のまなびクエスト / ao-learning-quest

青ちゃん向けの忘却曲線Web学習ツール。  
v1対象教材：語彙力UP1300

## 目的

語彙力UP1300の1300語を、日をまたいだ復習によって定着させる。  
目標：**90%を定着○にする**

## ディレクトリ

| フォルダ | 内容 |
|---|---|
| `app/` | GitHub Pages公開用（これだけ公開） |
| `docs/` | 作業ルール・実装指示書 |
| `questions/` | 問題JSON（作業用） |
| `scans/` | スキャンPDF（非公開） |
| `extracted/` | 抽出データ（非公開） |
| `image-prompts/` | 画像生成プロンプト |
| `generated-images/` | 生成画像ストック |

## 技術構成

- HTML / CSS / Vanilla JavaScript
- Firebase Realtime Database（進捗保存）
- GitHub Pages（公開）

## 仕様書

詳細は [ao-learning-quest_v1_spec.md](ao-learning-quest_v1_spec.md) を参照。
