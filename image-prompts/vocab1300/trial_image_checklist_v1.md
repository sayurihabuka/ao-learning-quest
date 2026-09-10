# vocab1300 試作画像 生成後チェックリスト v1

**対象**: 青のまなびクエスト — 語彙力UP1300 試作11件  
**作成日**: 2026-07-02  
**用途**: 生成後の品質確認・採用可否の記録  
**生成画像保存先**: `generated-images/trial/v1/`  
**採用画像移動先**: `app/images/`

---

## チェック基準

| 項目 | 確認内容 |
|---|---|
| 生成済み | `generated-images/trial/v1/` にファイルが存在するか |
| 文字なし | 文字・数字・記号・吹き出し・ラベルが入っていないか |
| 意味が合う | 語句のイメージと絵の内容が合っているか |
| 小さくても分かる | アプリ内の小サイズ（約100px前後）でも内容が伝わるか |
| 採用/再生成 | 採用 or 再生成（再生成の場合はメモに理由を記載） |

---

## チェック表

| No | word | file | 生成済み | 文字なし | 意味が合う | 小さくても分かる | 採用/再生成 | メモ |
|---:|---|---|:---:|:---:|:---:|:---:|---|---|
| 01 | 一羽 | counter_rabbit_wa.png | ✓ | ✓ | ✓ | ✓ | 採用 | |
| 02 | 傘かしげ | manners_kasakashige.png | ✓ | ✓ | ✓ | ✓ | 採用 | |
| 03 | 袂 | clothing_tamoto.png | ✓ | ✓ | ✓ | ✓ | 採用 | |
| 04 | 篠突く雨 | weather_shinotsuku_ame.png | ✓ | ✓ | ✓ | ✓ | 採用寄り | |
| 05 | おろし | weather_oroshi.png | ✓ | ✓ | ✓ | ✓ | 採用寄り | 最新生成版は採用寄り |
| 06 | 霧 | weather_kiri.png | ✓ | ✓ | ✓ | ✓ | 採用寄り | Firefly GP2版は採用寄り。Gemini版は薄すぎるため要注意 |
| 07 | たそがれ | daytime_tasogare.png | ✓ | | ✓ | ✓ | 採用寄り | GP生成版またはFirefly GP2版が採用候補。Gemini版は黒ベタ・枠ありになりやすく要注意 |
| 08 | 土ふまず | body_tsuchifumazu.png | ✓ | ✓ | ✓ | ✓ | 採用 | |
| 09 | 鴨居 | house_kamoi.png | ✓ | ✓ | ✓ | ✓ | 採用寄り | 矢印あり版で改善。必要なら正面構図でもう一度検討 |
| 10 | おろす | cooking_orosu.png | ✓ | ✓ | ✓ | ✓ | 採用 | |
| 11 | いろり | old_tool_irori.png | ✓ | ✓ | ✓ | ✓ | 採用寄り | 矢印あり版で改善 |

---

## 生成後の次のステップ

1. 上のチェック表を埋める
2. 「採用」の画像は `app/images/` に移動・リネーム（ファイル名は `images/` 列を参照）
3. 「再生成」の画像はプロンプトを修正して再依頼
4. 全11件が採用になったら、本番96件の画像生成フェーズへ進む

---

## 採用後の移動先（参考）

| file（生成時） | app/images/ 移動先 |
|---|---|
| counter_rabbit_wa.png | app/images/counter_rabbit_wa.png |
| manners_kasakashige.png | app/images/manners_kasakashige.png |
| clothing_tamoto.png | app/images/clothing_tamoto.png |
| weather_shinotsuku_ame.png | app/images/weather_shinotsuku_ame.png |
| weather_oroshi.png | app/images/weather_oroshi.png |
| weather_kiri.png | app/images/weather_kiri.png |
| daytime_tasogare.png | app/images/daytime_tasogare.png |
| body_tsuchifumazu.png | app/images/body_tsuchifumazu.png |
| house_kamoi.png | app/images/house_kamoi.png |
| cooking_orosu.png | app/images/cooking_orosu.png |
| old_tool_irori.png | app/images/old_tool_irori.png |
