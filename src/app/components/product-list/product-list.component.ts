import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss'
})
export class ProductListComponent implements OnInit {
  products: Product[] = [];
  selectedCategoryId: number | null = null;
  
  // Modal State
  showCreateModal = false;
  newProduct: Product = {
    name: '',
    price: 0,
    stock: 0,
    active: true,
    categoryId: 1
  };

  // Toast State
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  private productService = inject(ProductService);

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.productService.getAll().subscribe({
      next: (data) => {
        this.products = data;
      },
      error: (err) => {
        console.error('Error fetching products', err);
        // Fallback for UI demo purposes if backend is not running
        this.products = [
          { productId: 1, name: 'Cyber Laptop X', price: 1500, stock: 10, active: true, categoryId: 1, category: { categoryId: 1, category: 'Tecnología', active: true } },
          { productId: 2, name: 'Neon Smartphone', price: 800, stock: 25, active: true, categoryId: 2, category: { categoryId: 2, category: 'Hogar', active: true } },
          { productId: 3, name: 'Holo Smartwatch', price: 300, stock: 50, active: true, categoryId: 3, category: { categoryId: 3, category: 'Deportes', active: true } }
        ];
      }
    });
  }

  filterByCategory(categoryId: number | null): void {
    this.selectedCategoryId = categoryId;
    if (categoryId === null) {
      this.loadProducts();
    } else {
      this.productService.getByCategory(categoryId).subscribe({
        next: (data) => {
          this.products = data;
        },
        error: (err) => {
          console.error(`Error fetching products by category ${categoryId}`, err);
          this.triggerToast(`Filtro por categoría ${categoryId} (Simulación local)`, 'error');
          // Offline fallback
          this.products = [
            { productId: 1, name: 'Cyber Laptop X', price: 1500, stock: 10, active: true, categoryId: 1, category: { categoryId: 1, category: 'Tecnología', active: true } },
            { productId: 2, name: 'Neon Smartphone', price: 800, stock: 25, active: true, categoryId: 2, category: { categoryId: 2, category: 'Hogar', active: true } },
            { productId: 3, name: 'Holo Smartwatch', price: 300, stock: 50, active: true, categoryId: 3, category: { categoryId: 3, category: 'Deportes', active: true } }
          ].filter(p => p.categoryId === categoryId);
        }
      });
    }
  }

  deleteProduct(id: number | undefined, event: Event): void {
    event.stopPropagation();
    if (id === undefined) return;
    
    if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      this.productService.delete(id).subscribe({
        next: (success) => {
          if (success) {
            this.triggerToast('Producto eliminado correctamente', 'success');
            this.products = this.products.filter(p => p.productId !== id);
          } else {
            this.triggerToast('No se pudo eliminar el producto', 'error');
          }
        },
        error: (err) => {
          console.error('Error deleting product', err);
          this.triggerToast('Eliminado en simulación local (sin servidor)', 'success');
          this.products = this.products.filter(p => p.productId !== id);
        }
      });
    }
  }

  saveProduct(): void {
    if (!this.newProduct.name || this.newProduct.price <= 0 || this.newProduct.stock < 0) {
      this.triggerToast('Por favor complete los campos correctamente.', 'error');
      return;
    }

    const categoryNames: { [key: number]: string } = {
      1: 'Tecnología',
      2: 'Hogar',
      3: 'Deportes'
    };

    const productToSave: Product = {
      ...this.newProduct,
      category: {
        categoryId: this.newProduct.categoryId,
        category: categoryNames[this.newProduct.categoryId] || 'Otros',
        active: true
      }
    };

    this.productService.save(productToSave).subscribe({
      next: (savedProduct) => {
        this.triggerToast('Producto guardado con éxito', 'success');
        this.products.unshift(savedProduct);
        this.closeModal();
      },
      error: (err) => {
        console.error('Error saving product', err);
        this.triggerToast('Guardado en simulación local (sin servidor)', 'success');
        // Simulation preview
        const simulatedProduct: Product = {
          ...productToSave,
          productId: Math.floor(Math.random() * 1000) + 100
        };
        this.products.unshift(simulatedProduct);
        this.closeModal();
      }
    });
  }

  openModal(): void {
    this.showCreateModal = true;
  }

  closeModal(): void {
    this.showCreateModal = false;
    this.newProduct = {
      name: '',
      price: 0,
      stock: 0,
      active: true,
      categoryId: 1
    };
  }

  triggerToast(message: string, type: 'success' | 'error' = 'success'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }
}
