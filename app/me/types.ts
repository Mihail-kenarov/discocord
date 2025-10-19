export type Guild = {
  id: string | number;
  name: string;
  iconUrl?: string | null;
  href?: string;
};

export type AppSidebarUser = {
  name: string;
  imageUrl?: string | null;
  username?: string | null;
  email?: string | null;
};
