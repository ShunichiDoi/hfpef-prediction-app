# HFpEF統合予測プロトタイプ

`index.html` をブラウザで開くと、H2FPEF、HFpEF-ABA、HFA-PEFF、BREATH2を併用したHFpEF予測アプリを試せます。

GitHub Pagesで公開する場合は、このフォルダのファイルをリポジトリへアップロードし、PagesのSourceをGitHub Actionsに設定します。

## 実装内容

- H2FPEF: BMI、抗高血圧薬数、心房細動、PASP、年齢、E/e'から0-9点を計算
- HFpEF-ABA: 年齢、BMI、心房細動を使うロジスティック式で確率を計算
- HFA-PEFF: functional、morphological、biomarkerの3領域を0-6点で計算
- BREATH2: BNP/NT-proBNP、CTR、年齢、心房細動、CAD、Hb、LV高電位から0-9点を計算
- 統合モデル: 各スコアを特徴量にした暫定ロジスティックメタモデル

## 公開手順

1. GitHubで `hfpef-prediction-app` などの空リポジトリを作成
2. `index.html`、`app.js`、`styles.css`、`README.md`、`.nojekyll`、`.github/workflows/pages.yml` をアップロード
3. Repository Settings > Pages > Build and deployment > Sourceを `GitHub Actions` に変更
4. Actionsの `Deploy static site to Pages` が完了すると公開URLが発行されます

## 次に必要なこと

実臨床データで機械学習モデルを作る場合は、ラベル付きデータセットが必要です。推奨カラムは以下です。

- outcome_hfpef: HFpEFあり/なし
- age, sex, height, weight, bmi
- atrial_fibrillation, coronary_artery_disease
- antihypertensives, hemoglobin, bnp, ntprobnp
- ctr, lv_voltage
- ee_prime, pasp, tr_vmax, septal_e, lateral_e, gls, lavi, lvmi, rwt, wall_thickness
- h2fpef_score, hfpef_aba_probability, hfa_peff_score, breath2_score

研究・プロトタイプ用です。医療判断には検証済みモデル、施設内レビュー、倫理・個人情報管理が必要です。
