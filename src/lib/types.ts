// 照片元数据（精简版，用于地球浮空卡片展示）
export interface PhotoMeta {
  url: string;
  title?: string | null;
  description?: string | null;
  takenAt?: string | null; // ISO 日期字符串
}

export interface GlobePin {
  id: string;
  lat: number;
  lng: number;
  name: string;
  photoCount: number;
  coverUrl?: string;
  // 该地点所有照片 URL，用于随机选取浮空展示
  photoUrls?: string[];
  // 照片元数据（含标题、描述、拍摄日期），用于展开卡片
  photos?: PhotoMeta[];
}

export interface LocationData {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
  isPublic: boolean;
  createdAt: string;
  userId: string;
  user?: {
    name: string | null;
    image: string | null;
  };
  photos: PhotoData[];
  _count?: {
    photos: number;
  };
}

export interface PhotoData {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  title: string | null;
  description: string | null;
  takenAt: string | null;
  createdAt: string;
  locationId: string;
}
