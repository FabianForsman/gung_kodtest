import { Component, OnInit } from '@angular/core';
import { CategoryService, Category } from '../services/category.service';
import { ProductService, Product } from '../services/product.service';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { switchMap, forkJoin, BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ScrollingModule } from '@angular/cdk/scrolling';

interface categoryIdTree {
  id: string;
  children: categoryIdTree[];
}

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, ScrollingModule]
})
export class ProductListComponent implements OnInit {
  products = new Map<string, { product: Product, categories: string[] }>();
  filteredProducts$ = new BehaviorSubject<{ product: Product, categories: string[] }[]>([]);
  productIndex = new Map<string, Product>();
  categoryTreeLeafMap: Map<string, string[]> = new Map();
  categoryNameCache = new Map<string, string>();
  categoryIdTree: categoryIdTree[] = [];
  filterForm!: FormGroup;
  sortForm!: FormGroup;
  
  constructor(private categoryService: CategoryService, private productService: ProductService) {}

  ngOnInit(): void {
    this.initializeForms();
    this.loadData();
  }

  private initializeForms(): void {
    this.filterForm = new FormGroup({
      id: new FormControl(''),
      name: new FormControl(''),
      minPrice: new FormControl(null),
      maxPrice: new FormControl(null),
      minVolume: new FormControl(null),
      maxVolume: new FormControl(null),
      inStockOnly: new FormControl(false),
      categories: new FormControl([])
    });

    this.sortForm = new FormGroup({
      sortKey: new FormControl('id'),
      sortOrder: new FormControl('asc')
    });

    this.filterForm.valueChanges.subscribe(() => this.updateFilteredProducts());
    this.sortForm.valueChanges.subscribe(() => this.updateFilteredProducts());
  }

  private loadData(): void {
    this.categoryService.getAlotOfCategories().pipe(
      switchMap(categoryTree => {
        this.categoryTreeLeafMap = this.flattenCategoryTree(categoryTree);
        return this.fetchProductDetails(categoryTree);
      })
    ).subscribe(() => {
      this.indexProducts();
      this.updateFilteredProducts();
    });

  }

  private flattenCategoryTree(categoryTree: Category): Map<string, string[]> {
    const categoryMap = new Map<string, string[]>();

    const traverse = (category: Category, parentCategories: string[]) => {
      const currentCategories = [...parentCategories, category.id];
      categoryMap.set(category.id, currentCategories);
      // if category.id starts with 's', it is a category, thus we cache the name
      if (category.id.startsWith('s')) {
        this.categoryNameCache.set(category.id, category.name);
        const newNode: categoryIdTree = { id: category.id, children: [] };
        if (parentCategories.length > 0) {
          const parentId = parentCategories[parentCategories.length - 1];
          const parentNode = this.findNodeById(this.categoryIdTree, parentId);
          if (parentNode) {
            parentNode.children.push(newNode);
          }
        } else {
          this.categoryIdTree.push(newNode);
        }
      }

      category.children.forEach(child => traverse(child, currentCategories));
      // pop the last category to avoid including the product id in the category list
      currentCategories.pop();
    };

    traverse(categoryTree, []);
    console.log(categoryMap);
    return categoryMap;
  }

  findNodeById(tree: categoryIdTree[], id: string): categoryIdTree | undefined {
    for (let i = 0; i < tree.length; i++) {
      if (tree[i].id === id) {
        return tree[i];
      }
      const found = this.findNodeById(tree[i].children, id);
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  private fetchProductDetails(categoryTree: Category): Observable<any> {
    const productRequests: { id: string, categories: string[] }[] = [];

    this.categoryTreeLeafMap.forEach((categories: string[], id: string) => {
      productRequests.push({ id, categories });
    });

    const batchSize = 100;
    const batches = [];

    for (let i = 0; i < productRequests.length; i += batchSize) {
      const batch = productRequests.slice(i, i + batchSize);
      batches.push(
        forkJoin(
          batch.map(request =>
            this.productService.getProduct(request.id).pipe(
              map(productDetails => {
                if (!productDetails) {
                  productDetails = { id: request.id, name: '', extra: { AGA: { PRI: 0, VOL: 0, LGA: 0 } } };
                }
                this.products.set(request.id, { product: productDetails, categories: request.categories });
              })
            )
          )
        )
      );
    }

    return forkJoin(batches);
  }

  private indexProducts(): void {
    this.productIndex.clear();
    this.products.forEach(({ product }) => {
      this.productIndex.set(product.id, product);
    });
  }

  private updateFilteredProducts(): void {
    const filters = this.filterForm.value;
    let empty = false;
    console.log(filters);
    console.log(filters.categories.length);
    if (filters.categories.length === 1 && filters.categories[0] === '' || filters.categories.length === 0) {
      empty = true;
    }

    let filteredArray = Array.from(this.products.values()).filter(({ product, categories }) => {
      return (!filters.id || product.id.includes(filters.id)) &&
      (!filters.name || product.name.includes(filters.name)) &&
      (!filters.minPrice || product.extra['AGA'].PRI >= filters.minPrice) &&
      (!filters.maxPrice || product.extra['AGA'].PRI <= filters.maxPrice) &&
      (!filters.minVolume || product.extra['AGA'].VOL >= filters.minVolume) &&
      (!filters.maxVolume || product.extra['AGA'].VOL <= filters.maxVolume) &&
      (!filters.inStockOnly || product.extra['AGA'].LGA > 0) &&
      ((filters.categories.some((category: string) => categories.includes(category))) || empty)  &&
      !product.id.startsWith('s'); // Id may not start with 's'
    });

    // if (!categories.includes(this.filterValues.categories) && this.filterValues.categories.length > 0)
  
    this.sortProducts(filteredArray);
    
    this.filteredProducts$.next([...filteredArray]);
  }
  

  private sortProducts(products: { product: Product, categories: string[] }[]): void {
    const { sortKey, sortOrder } = this.sortForm.value;
    const orderMultiplier = sortOrder === 'asc' ? 1 : -1;

    const sortFunctions: { [key: string]: (a: any, b: any) => number } = {
      id: (a, b) => a.product.id.localeCompare(b.product.id) * orderMultiplier,
      name: (a, b) => a.product.name.localeCompare(b.product.name) * orderMultiplier,
      price: (a, b) => (a.product.extra.AGA.PRI - b.product.extra.AGA.PRI) * orderMultiplier,
      volume: (a, b) => (a.product.extra.AGA.VOL - b.product.extra.AGA.VOL) * orderMultiplier,
      stock: (a, b) => ((a.product.extra.AGA.LGA > 0 ? 0 : 1) - (b.product.extra.AGA.LGA > 0 ? 0 : 1)) * orderMultiplier,
      categories: (a, b) => this.getCategoryNames(a.categories).localeCompare(this.getCategoryNames(b.categories)) * orderMultiplier
    };

    if (sortFunctions[sortKey]) {
      products.sort(sortFunctions[sortKey]);
    }
  }

  getCategoryNames(categoryIds: string[]): string {
    return categoryIds
      .map(categoryId => this.categoryNameCache.get(categoryId) || categoryId) 
      .join(' > ');
  }

  applyButton(): void {
    this.updateFilteredProducts();
  }

  resetButton(): void {
    this.filterForm.reset({
      id: '',
      name: '',
      minPrice: null,
      maxPrice: null,
      minVolume: null,
      maxVolume: null,
      inStockOnly: false,
      categories: []
    });

    this.sortForm.reset({
      sortKey: 'id',
      sortOrder: 'asc'
    });

    this.updateFilteredProducts();
  }
}
