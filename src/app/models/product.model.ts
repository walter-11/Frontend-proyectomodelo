export interface Category {
  categoryId: number;
  category: string;
  active: boolean;
}

export interface Product {
  productId?: number;
  name: string;
  categoryId: number;
  price: number;
  stock: number;
  active: boolean;
  category?: Category;
}
