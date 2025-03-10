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
  flattenedCategories: Category[] = [];
  products: { [id: string]: { product: Product, categories: string[] } } = {};
  filteredProducts: { [id: string]: { product: Product, categories: string[] } } = {};
  filterForm!: FormGroup;
  sortForm!: FormGroup;
  categoryTreeProductLeaf: any = {};
  
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

    this.filterForm.valueChanges.subscribe(() => {
      this.applyFilters(this.filterForm.value);
    });

    this.sortForm.valueChanges.subscribe(() => {
      this.applySort(this.sortForm.value);
    });

    this.categoryService.getCategories().subscribe((categoryTree) => {
      this.flattenCategories(categoryTree);
      this.fetchProductDetails();
    });

    this.filterValues.categories = this.filterValues.categories;
    this.filterForm.setValue(this.filterValues);
    this.sortForm.setValue(this.sortValues);

    this.categoryService.getCategories().subscribe((categoryTree) => {
      this.categoryTreeProductLeaf = this.getCategoriesInTree(JSON.stringify(categoryTree));
    });

    Object.values(this.products).forEach(({ product }) => {
      this.updateCategoriesForProduct(product.id);
    });
  }

  private flattenCategories(category: Category): void {
    let flatList: Category[] = [];
    const traverse = (node: Category) => {
      flatList.push(node);
      node.children.forEach(traverse);
    };
    traverse(category);
    this.flattenedCategories = flatList;
  }

  // This function will fetch the product details for each category. Only used for the initial load.
  private fetchProductDetails(): void {
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
            this.products[child.id] = { product: productDetails, categories: [category.id] };
          });
        }
      });
    };
    this.flattenedCategories.forEach((category) => {
      traverse(category, []);
    });
  }

  private getCategoriesInTree(json: string): any {
    const obj = JSON.parse(json);
    const traverse = (node: any): any => {
      if (node.id.startsWith('s')) {
        const categoryNode: any = { id: node.id, children: [] };
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
    }
    else if (categoryIds.length === 0) {
      return 'No category selected';
    }
    else if (categoryIds.length === 1) {
      const category = this.flattenedCategories.find((cat) => cat.id === categoryIds[0]);
      return category ? category.name : categoryIds[0];
    }
    categoryIds = categoryIds.slice();
    console.log(categoryIds);
    // reverse the list so that the most specific category is first
    // if single category is selected, return the name of the category
    return categoryIds.map((categoryId: string) => {
      const category = this.flattenedCategories.find((cat) => cat.id === categoryId);
      return category ? category.name : categoryId;
    }).join(', ');
  }

  updateSelectedCategories(event: any): void {
    this.filterValues.categories = this.filterForm.value.categories;
    this.filterForm.setValue(this.filterValues);
    this.UpdateFilteredProducts();
  }

  applyFilters(event: any): void {
    this.filterValues = event;
    this.UpdateFilteredProducts();
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
      this.filterValues.inStockOnly && prod.product.extra['AGA']['LGA'] <= 0 ) {
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
    let newFilteredProducts: { [id: string]: { product: Product, categories: string[] } } = {};
    const sortFunctions: { [key: string]: (a: string, b: string) => number } = {
      id: (a, b) => a.localeCompare(b),
      name: (a, b) => this.filteredProducts[a].product.name.localeCompare(this.filteredProducts[b].product.name),
      price: (a, b) => this.filteredProducts[a].product.extra['AGA']['PRI'] - this.filteredProducts[b].product.extra['AGA']['PRI'],
      volume: (a, b) => this.filteredProducts[a].product.extra['AGA']['VOL'] - this.filteredProducts[b].product.extra['AGA']['VOL'],
      stock: (a, b) => (this.filteredProducts[a].product.extra['AGA']['LGA'] > 0 ? 0 : 1) - (this.filteredProducts[b].product.extra['AGA']['LGA'] > 0 ? 0 : 1),
      categories: (a, b) => this.getCategoryNames(this.filteredProducts[a].categories).localeCompare(this.getCategoryNames(this.filteredProducts[b].categories))
    };

    const sortFunction = sortFunctions[sortValues.sortKey];
    const sortedKeys = Object.keys(this.filteredProducts).sort(sortFunction);
    if (sortValues.sortOrder === 'desc') {
      sortedKeys.reverse();
    }

    sortedKeys.forEach((key) => {
      newFilteredProducts[key] = this.filteredProducts[key];
    });
    this.filteredProducts = newFilteredProducts;
  }

  getFilteredProductsArray(): { product: Product, categories: string[] }[] {
    return Object.values(this.filteredProducts);
  }


  sortOrder(sortKey: string): void {
    this.sortValues.sortKey = sortKey;
    this.sortValues.sortOrder = this.sortValues.sortOrder === 'asc' ? 'desc' : 'asc';
    this.sortForm.setValue(this.sortValues);
  }

  setSortKey(sortKey: string): void {
    this.sortValues.sortKey = sortKey;
    this.sortForm.setValue(this.sortValues);
  }
}