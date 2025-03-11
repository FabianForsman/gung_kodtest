import { Component, OnInit } from '@angular/core';
import { CategoryService, Category } from '../services/category.service';
import { ProductService, Product } from '../services/product.service';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule]
})
export class ProductListComponent implements OnInit {
  products: { [id: string]: { product: Product, categories: string[] } } = {};
  filteredProducts: { [id: string]: { product: Product, categories: string[] } } = {};
  filterForm!: FormGroup;
  sortForm!: FormGroup;
  categoryTreeProductLeaf: any = {};
  submitted: boolean = false;
  
  filterValues: any = {
    id: '',
    name: '',
    minPrice: null,
    maxPrice: null,
    minVolume: null,
    maxVolume: null,
    inStockOnly: false,
    categories: []
  };

  sortValues: any = {
    sortKey: 'id',
    sortOrder: 'asc'
  };

  constructor(private categoryService: CategoryService, private productService: ProductService) {}

  ngOnInit(): void {
    this.loadData();
    this.initializeForms();
    this.resetButton();
  }

  private initializeForms(): void {
    this.filterForm = new FormGroup({
      id: new FormControl(''),
      name: new FormControl(''),
      minPrice: new FormControl(''),
      maxPrice: new FormControl(''),
      minVolume: new FormControl(''),
      maxVolume: new FormControl(''),
      inStockOnly: new FormControl(false),
      categories: new FormControl([])
    });

    this.sortForm = new FormGroup({
      sortKey: new FormControl('id'),
      sortOrder: new FormControl('asc')
    });

    //this.sortForm.valueChanges.subscribe(() => {
    //  this.applySort(this.sortForm.value);
    //});

    this.filterValues.categories = this.filterValues.categories; // Should not be necessary, but it is.
    this.filterForm.setValue(this.filterValues);
    this.sortForm.setValue(this.sortValues);
  }

  private loadData(): void {
    this.categoryService.getAlotOfCategories().subscribe((categoryTree) => {
      this.categoryTreeProductLeaf = this.getCategoriesInTree(JSON.stringify(categoryTree));
      this.fetchProductDetails(categoryTree);
    });
    Object.values(this.products).forEach(({ product }) => {
      this.updateCategoriesForProduct(product.id);
    });
  }

  private fetchProductDetails(categoryTree: any): void {
    const traverse = (category: Category, parentCategories: string[]) => {
      const currentCategories = [...parentCategories, category.id];
      if (category.children.length === 0) {
        return;
      }
      category.children.forEach((child) => {
        if (child.children.length > 0) {
          traverse(child, currentCategories);
        } else {
          this.productService.getProduct(child.id).subscribe((productDetails) => {
            if (!productDetails) {
              productDetails = { id: child.id, name: child.name, extra: { AGA: { PRI: 0, VOL: 0, LGA: 0 } } };
            }
            this.products[child.id] = { product: productDetails, categories: [category.id] };
          });
        }
      });
    };
    traverse(categoryTree, []);
  }

  private getCategoriesInTree(json: string): any {
    const obj = JSON.parse(json);
    const traverse = (node: any): any => {
      if (node.id.startsWith('s')) {
        const categoryNode: any = { id: node.id, name: node.name, children: [] };
        if (node.children) {
          node.children.forEach((child: any) => {
            const childNode = traverse(child);
            if (childNode) {
              categoryNode.children.push(childNode);
            }
          });
        }
        return categoryNode;
      } else {
        return node.id;
      }
    };
    return traverse(obj);
  }

  getAllCategoriesForProduct(productId: string): string[] {
    const productEntry = this.products[productId];
    if (!productEntry) {
      return [];
    }

    const categories = new Set<string>();
    const traverse = (node: any, categoryId: string) => {
      if (node.id === categoryId) {
        categories.add(node.id);
        return true;
      }
      if (node.children) {
        for (const child of node.children) {
          if (traverse(child, categoryId)) {
            categories.add(node.id);
            return true;
          }
        }
      }
      return false;
    };

    productEntry.categories.forEach(categoryId => traverse(this.categoryTreeProductLeaf, categoryId));
    return Array.from(categories);
  }

  updateCategoriesForProduct(productId: string): void {
    this.products[productId].categories = this.getAllCategoriesForProduct(productId);
  }

  getCategoryNames(categoryIds: any): string {
    if (!Array.isArray(categoryIds)) {
      categoryIds = [categoryIds];
    } else if (categoryIds.length === 0) {
      return 'No category selected';
    }
    categoryIds = categoryIds.slice();
    // reverse the list so that the most specific category is first
    // if single category is selected, return the name of the category
    return categoryIds.reverse().map((categoryId: string) => {
      return this.getCategoryName(categoryId);
    }).join(' > ');
  }

  getCategoryName(categoryId: string): string {
    const traverse = (node: any): string => {
      if (node.id === categoryId) {
        return node.name;
      }
      if (node.children) {
        for (const child of node.children) {
          const result = traverse(child);
          if (result) {
            return result;
          }
        }
      }
      return '';
    };
    return traverse(this.categoryTreeProductLeaf);
  }

  private UpdateFilteredProducts(): void {
    this.filteredProducts = {};
    Object.keys(this.products).forEach((productId) => {
      const product = this.products[productId].product;
      const categories = this.products[productId].categories;
      if (this.filterProduct(product, categories)) {
        this.filteredProducts[productId] = this.products[productId];
      }
    });
    this.applySort(this.sortValues);
  }

  filterProduct(product: Product, categories: string[]): boolean {
    let prod = this.products[product.id];
    if (this.filterValues.id && !prod.product.id.includes(this.filterValues.id) ||
      this.filterValues.name && !prod.product.name.includes(this.filterValues.name) ||
      this.filterValues.minPrice && prod.product.extra['AGA']['PRI'] < this.filterValues.minPrice ||
      this.filterValues.maxPrice && prod.product.extra['AGA']['PRI'] > this.filterValues.maxPrice ||
      this.filterValues.minVolume && prod.product.extra['AGA']['VOL'] < this.filterValues.minVolume ||
      this.filterValues.maxVolume && prod.product.extra['AGA']['VOL'] > this.filterValues.maxVolume ||
      this.filterValues.inStockOnly && prod.product.extra['AGA']['LGA'] <= 0) {
      return false;
    }
    // if this.filterValues.categories is not in categories
    if (!categories.includes(this.filterValues.categories) && this.filterValues.categories.length > 0) {
      return false;
    }
    return true;
  }

  applySort(sortValues: any): void {
    this.sortValues = sortValues;
    const sortKey = sortValues.sortKey;
    const sortOrder = sortValues.sortOrder === 'asc' ? 1 : -1;

    const sortFunctions: { [key: string]: (a: any, b: any) => number } = {
      id: (a, b) => a.localeCompare(b) * sortOrder,
      name: (a, b) => this.filteredProducts[a].product.name.localeCompare(this.filteredProducts[b].product.name) * sortOrder,
      price: (a, b) => (this.filteredProducts[a].product.extra['AGA']['PRI'] - this.filteredProducts[b].product.extra['AGA']['PRI']) * sortOrder,
      volume: (a, b) => (this.filteredProducts[a].product.extra['AGA']['VOL'] - this.filteredProducts[b].product.extra['AGA']['VOL']) * sortOrder,
      stock: (a, b) => {
        const stockA = this.filteredProducts[a].product.extra['AGA']['LGA'] > 0 ? 0 : 1;
        const stockB = this.filteredProducts[b].product.extra['AGA']['LGA'] > 0 ? 0 : 1;
        return (stockA - stockB) * sortOrder;
      },
      categories: (a, b) => this.getCategoryNames(this.filteredProducts[a].categories).localeCompare(this.getCategoryNames(this.filteredProducts[b].categories)) * sortOrder
    };

    const sortedKeys = Object.keys(this.filteredProducts).sort(sortFunctions[sortKey]);
    this.filteredProducts = sortedKeys.reduce((acc, key) => {
      acc[key] = this.filteredProducts[key];
      return acc;
    }, {} as { [id: string]: { product: Product, categories: string[] } });
  }

  setSotringOrder(event: any): void {
    this.sortValues.sortOrder = event.target.value;
  }

  applyButton(): void {
    this.submitted = true;
    this.filterValues = this.filterForm.value;
    this.sortValues = this.sortForm.value;
    this.UpdateFilteredProducts();
  }

  resetButton(): void {
    this.filterValues = {
      id: '',
      name: '',
      minPrice: null,
      maxPrice: null,
      minVolume: null,
      maxVolume: null,
      inStockOnly: false,
      categories: []
    };
    this.sortValues = {
      sortKey: 'id',
      sortOrder: 'asc'
    };
    this.UpdateFilteredProducts();
    this.filterForm.setValue(this.filterValues);
    this.sortForm.setValue(this.sortValues);
    this.applyButton();
    this.submitted = false;
  }

  getFilteredProductsArray(): { product: Product, categories: string[] }[] {
    if (this.submitted) {
      this.UpdateFilteredProducts();
    }
    this.submitted = false;
    return Object.values(this.filteredProducts);
  }

  sortOrder(sortKey: string): void {
    this.sortValues.sortKey = sortKey;
    this.sortValues.sortOrder = this.sortValues.sortOrder === 'asc' ? 'desc' : 'asc';
  }

  setSortKey(sortKey: string): void {
    this.sortValues.sortKey = sortKey;
  }
}
