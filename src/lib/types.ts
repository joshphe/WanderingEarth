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

/** 照片完整信息（Profile / MemoryList / PhotoGrid 共用） */
export interface PhotoItem {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  takenAt: string | null;
  isPublic?: boolean;
  createdAt: string;
}

/** 地点完整信息（Profile / MemoryList 共用） */
export interface LocationItem {
  id: string;
  lat: number;
  lng: number;
  name: string;
  country?: string | null;
  countryCode?: string | null;
  city?: string | null;
  state?: string | null;
  isPublic?: boolean;
  photoCount: number;
  coverUrl: string | null;
  photoUrls: string[];
  photos: PhotoItem[];
}

/** 地理编码搜索结果 */
export interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  type?: string;
  address?: {
    country?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    region?: string;
    country_code?: string;
  };
}

/** 用户精简信息 */
export interface UserProp {
  id?: string;
  name?: string | null;
  email?: string | null;
  isPublic?: boolean;
}

/** 格式化地理编码搜索结果 */
export function formatSearchResult(r: SearchResult): { title: string; subtitle: string } {
  const addr = r.address || {};
  const parts: string[] = [];
  if (addr.city) parts.push(addr.city);
  else if (addr.town) parts.push(addr.town);
  else if (addr.village) parts.push(addr.village);
  if (addr.state) parts.push(addr.state);
  if (addr.country) parts.push(addr.country);

  const title = r.name || r.display_name.split(",")[0]?.trim() || "未知地点";
  const subtitle = parts.join(" · ") || r.display_name.split(",").slice(1, 3).join(",").trim();

  return { title, subtitle };
}

/** 评论用户精简信息 */
export interface CommentUser {
  id: string;
  name: string | null;
  image: string | null;
}

/** 评论（含嵌套回复） */
export interface CommentItem {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  user: CommentUser;
  parentId: string | null;
  replies: CommentItem[];
}
