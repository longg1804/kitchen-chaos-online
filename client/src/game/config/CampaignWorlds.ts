export interface LevelConfig {
  id: string;              // e.g. '1-1', '1-2', '2-1'
  worldId: number;         // 1, 2, 3, 4, 5, 6, 7
  name: string;            // e.g. 'Khởi Đầu Ấm Áp'
  subtitle: string;        // e.g. 'Làm quen với căn bếp cơ bản'
  theme: 'traditional' | 'farm' | 'pizza' | 'sushi' | 'chaotic';
  mapLayoutId: string;     // Layout map id to construct
  timeLimit: number;       // In seconds (e.g. 180s)
  recipes: string[];       // Recipe IDs from CAMPAIGN_RECIPES
  starThresholds: [number, number, number]; // [1 Star, 2 Stars, 3 Stars]
  hazardTypes: ('fire' | 'conveyor' | 'split')[];
}

export interface WorldConfig {
  id: number;
  name: string;
  theme: string;
  color: string;
  accentColor: string;
  badgeEmoji: string;
  description: string;
  levels: LevelConfig[];
}

export const CAMPAIGN_WORLDS: WorldConfig[] = [
  {
    id: 1,
    name: 'THẾ GIỚI 1: BẾP KHỞI ĐẦU',
    theme: 'traditional',
    color: '#2563eb',
    accentColor: '#60a5fa',
    badgeEmoji: '🏠',
    description: 'Học các kỹ năng cơ bản: lấy đồ, cắt thái, nấu nướng và giao món.',
    levels: [
      {
        id: '1-1',
        worldId: 1,
        name: 'Màn 1-1: Nhập Môn Đầu Bếp',
        subtitle: 'Làm quen với bánh mì và thịt bò nướng',
        theme: 'traditional',
        mapLayoutId: 'traditional',
        timeLimit: 180,
        recipes: ['BURGER_CLASSIC'],
        starThresholds: [80, 160, 240],
        hazardTypes: []
      },
      {
        id: '1-2',
        worldId: 1,
        name: 'Màn 1-2: Burger Phô Mai',
        subtitle: 'Thêm thao tác cắt thái phô mai vàng óng',
        theme: 'traditional',
        mapLayoutId: 'traditional',
        timeLimit: 180,
        recipes: ['BURGER_CLASSIC', 'BURGER_CHEESE'],
        starThresholds: [120, 240, 360],
        hazardTypes: ['fire']
      },
      {
        id: '1-3',
        worldId: 1,
        name: 'Màn 1-3: Đại Tiệc Burger Đầy Đủ',
        subtitle: 'Phối hợp nhịp nhàng giữa thớt cắt và bếp nướng',
        theme: 'traditional',
        mapLayoutId: 'traditional',
        timeLimit: 180,
        recipes: ['BURGER_CHEESE', 'BURGER_COMPLETE'],
        starThresholds: [150, 300, 450],
        hazardTypes: ['fire']
      }
    ]
  },
  {
    id: 2,
    name: 'THẾ GIỚI 2: TRANG TRẠI & NÔNG SẢN',
    theme: 'farm',
    color: '#16a34a',
    accentColor: '#4ade80',
    badgeEmoji: '🌾',
    description: 'Thu hoạch rau củ quả tươi sạch, chế biến các món salad phong phú.',
    levels: [
      {
        id: '2-1',
        worldId: 2,
        name: 'Màn 2-1: Vườn Rau Xanh',
        subtitle: 'Chế biến nhanh các món salad thanh mát',
        theme: 'farm',
        mapLayoutId: 'traditional',
        timeLimit: 180,
        recipes: ['FRESH_SALAD'],
        starThresholds: [100, 200, 320],
        hazardTypes: []
      },
      {
        id: '2-2',
        worldId: 2,
        name: 'Màn 2-2: Thu Hoạch Mùa Vàng',
        subtitle: 'Kết hợp salad trang trại nhiều nguyên liệu và burger',
        theme: 'farm',
        mapLayoutId: 'traditional',
        timeLimit: 180,
        recipes: ['FRESH_SALAD', 'FARM_DELUXE_SALAD', 'BURGER_COMPLETE'],
        starThresholds: [160, 320, 480],
        hazardTypes: ['fire']
      }
    ]
  },
  {
    id: 3,
    name: 'THẾ GIỚI 3: TIỆM BÁNH PIZZA NÓNG',
    theme: 'pizza',
    color: '#ea580c',
    accentColor: '#fb923c',
    badgeEmoji: '🍕',
    description: 'Lò nướng nhiệt độ cao và các loại topping phô mai, nấm béo ngậy.',
    levels: [
      {
        id: '3-1',
        worldId: 3,
        name: 'Màn 3-1: Pizza Phô Mai Nóng Hổi',
        subtitle: 'Chuẩn bị phô mai nướng chảy trên đế bánh',
        theme: 'pizza',
        mapLayoutId: 'traditional',
        timeLimit: 180,
        recipes: ['PIZZA_CHEESE'],
        starThresholds: [120, 250, 380],
        hazardTypes: ['fire']
      },
      {
        id: '3-2',
        worldId: 3,
        name: 'Màn 3-2: Vũ Điệu Nấm & Topping',
        subtitle: 'Sơ chế nấm tươi và hoàn thiện đơn hàng nhanh chóng',
        theme: 'pizza',
        mapLayoutId: 'traditional',
        timeLimit: 180,
        recipes: ['PIZZA_CHEESE', 'PIZZA_MUSHROOM'],
        starThresholds: [180, 360, 520],
        hazardTypes: ['fire']
      }
    ]
  },
  {
    id: 4,
    name: 'THẾ GIỚI 4: QUÁN SUSHI BỜ BIỂN',
    theme: 'sushi',
    color: '#0284c7',
    accentColor: '#38bdf8',
    badgeEmoji: '🍣',
    description: 'Chuyên về hải sản cá hồi, tôm nướng và nghệ thuật bày đĩa tinh tế.',
    levels: [
      {
        id: '4-1',
        worldId: 4,
        name: 'Màn 4-1: Cá Hồi Áp Chảo',
        subtitle: 'Canh thời gian cá chín vàng hoàn hảo',
        theme: 'sushi',
        mapLayoutId: 'conveyor',
        timeLimit: 180,
        recipes: ['SUSHI_SALMON'],
        starThresholds: [140, 280, 420],
        hazardTypes: ['conveyor', 'fire']
      },
      {
        id: '4-2',
        worldId: 4,
        name: 'Màn 4-2: Khay Hải Sản Thượng Hạng',
        subtitle: 'Phối hợp tôm và cá trên hệ thống băng chuyền di động',
        theme: 'sushi',
        mapLayoutId: 'conveyor',
        timeLimit: 180,
        recipes: ['SUSHI_SALMON', 'SEAFOOD_PLATTER'],
        starThresholds: [200, 400, 580],
        hazardTypes: ['conveyor', 'fire']
      }
    ]
  },
  {
    id: 5,
    name: 'THẾ GIỚI 5: NHÀ BẾP TÁCH ĐÔI NGUY HIỂM',
    theme: 'chaotic',
    color: '#7c3aed',
    accentColor: '#c084fc',
    badgeEmoji: '⚡',
    description: 'Không gian bếp bị chia cắt làm đôi, yêu cầu ném nguyên liệu liên tục.',
    levels: [
      {
        id: '5-1',
        worldId: 5,
        name: 'Màn 5-1: Bếp Tách Đôi Khởi Tranh',
        subtitle: 'Ném nguyên liệu qua lại giữa hai khu vực độc lập',
        theme: 'chaotic',
        mapLayoutId: 'split_kitchen',
        timeLimit: 180,
        recipes: ['BURGER_COMPLETE', 'FRESH_SALAD'],
        starThresholds: [180, 360, 500],
        hazardTypes: ['split', 'fire']
      },
      {
        id: '5-2',
        worldId: 5,
        name: 'Màn 5-2: Thử Thách Siêu Cấp',
        subtitle: 'Chế biến món Burger Hoàng Gia trong nhịp độ hỗn loạn',
        theme: 'chaotic',
        mapLayoutId: 'split_kitchen',
        timeLimit: 180,
        recipes: ['BURGER_COMPLETE', 'SUPER_BURGER', 'CHICKEN_FEAST'],
        starThresholds: [220, 440, 660],
        hazardTypes: ['split', 'fire']
      }
    ]
  }
];
