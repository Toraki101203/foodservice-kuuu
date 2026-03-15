// ============================================================
// 日本全国 47都道府県データ（地方別・主要都市付き）
// ============================================================

export type Prefecture = {
  name: string;
  cities: string[];
};

export type Region = {
  name: string;
  prefectures: Prefecture[];
};

export const REGIONS: Region[] = [
  {
    name: "北海道・東北",
    prefectures: [
      { name: "北海道", cities: ["札幌市", "函館市", "旭川市", "小樽市"] },
      { name: "青森県", cities: ["青森市", "弘前市", "八戸市"] },
      { name: "岩手県", cities: ["盛岡市", "花巻市"] },
      { name: "宮城県", cities: ["仙台市", "石巻市"] },
      { name: "秋田県", cities: ["秋田市"] },
      { name: "山形県", cities: ["山形市"] },
      { name: "福島県", cities: ["福島市", "郡山市", "いわき市"] },
    ],
  },
  {
    name: "関東",
    prefectures: [
      {
        name: "東京都",
        cities: [
          "渋谷区",
          "新宿区",
          "港区",
          "目黒区",
          "世田谷区",
          "品川区",
          "中央区",
          "千代田区",
          "豊島区",
          "台東区",
          "墨田区",
          "江東区",
          "杉並区",
          "中野区",
          "練馬区",
          "板橋区",
          "北区",
          "荒川区",
          "足立区",
          "葛飾区",
          "江戸川区",
          "大田区",
          "文京区",
        ],
      },
      {
        name: "神奈川県",
        cities: ["横浜市", "川崎市", "鎌倉市", "藤沢市", "相模原市"],
      },
      { name: "埼玉県", cities: ["さいたま市", "川越市", "大宮市"] },
      { name: "千葉県", cities: ["千葉市", "船橋市", "柏市", "浦安市"] },
      { name: "茨城県", cities: ["水戸市", "つくば市"] },
      { name: "栃木県", cities: ["宇都宮市", "日光市"] },
      { name: "群馬県", cities: ["前橋市", "高崎市"] },
    ],
  },
  {
    name: "中部",
    prefectures: [
      { name: "新潟県", cities: ["新潟市"] },
      { name: "富山県", cities: ["富山市"] },
      { name: "石川県", cities: ["金沢市"] },
      { name: "福井県", cities: ["福井市"] },
      { name: "山梨県", cities: ["甲府市"] },
      { name: "長野県", cities: ["長野市", "松本市"] },
      { name: "岐阜県", cities: ["岐阜市", "高山市"] },
      { name: "静岡県", cities: ["静岡市", "浜松市", "熱海市"] },
      { name: "愛知県", cities: ["名古屋市", "豊田市", "岡崎市"] },
    ],
  },
  {
    name: "関西",
    prefectures: [
      { name: "大阪府", cities: ["大阪市", "堺市", "豊中市", "吹田市"] },
      { name: "京都府", cities: ["京都市", "宇治市"] },
      {
        name: "兵庫県",
        cities: ["神戸市", "姫路市", "西宮市", "芦屋市"],
      },
      { name: "奈良県", cities: ["奈良市"] },
      { name: "滋賀県", cities: ["大津市"] },
      { name: "和歌山県", cities: ["和歌山市"] },
      { name: "三重県", cities: ["津市", "四日市市", "伊勢市"] },
    ],
  },
  {
    name: "中国",
    prefectures: [
      { name: "鳥取県", cities: ["鳥取市"] },
      { name: "島根県", cities: ["松江市", "出雲市"] },
      { name: "岡山県", cities: ["岡山市", "倉敷市"] },
      { name: "広島県", cities: ["広島市", "尾道市", "福山市"] },
      { name: "山口県", cities: ["山口市", "下関市"] },
    ],
  },
  {
    name: "四国",
    prefectures: [
      { name: "徳島県", cities: ["徳島市"] },
      { name: "香川県", cities: ["高松市"] },
      { name: "愛媛県", cities: ["松山市", "今治市"] },
      { name: "高知県", cities: ["高知市"] },
    ],
  },
  {
    name: "九州",
    prefectures: [
      { name: "福岡県", cities: ["福岡市", "北九州市", "久留米市"] },
      { name: "佐賀県", cities: ["佐賀市"] },
      { name: "長崎県", cities: ["長崎市", "佐世保市"] },
      { name: "熊本県", cities: ["熊本市"] },
      { name: "大分県", cities: ["大分市", "別府市"] },
      { name: "宮崎県", cities: ["宮崎市"] },
      { name: "鹿児島県", cities: ["鹿児島市"] },
    ],
  },
  {
    name: "沖縄",
    prefectures: [
      { name: "沖縄県", cities: ["那覇市", "沖縄市", "宜野湾市"] },
    ],
  },
];
