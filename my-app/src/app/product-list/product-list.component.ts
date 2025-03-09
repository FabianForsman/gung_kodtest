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
  products: Product[] = [];
  filteredProducts: Product[] = [];
  filterForm!: FormGroup;
  sortForm!: FormGroup;
  categories: any = {};

  filterValues: any = {
    id: '',
    name: '',
    minPrice: null,
    maxPrice: null,
    minVolume: null,
    maxVolume: null,
    inStockOnly: false
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
      inStockOnly: new FormControl(false)
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
      this.flattenedCategories = this.flattenCategories(categoryTree);
      this.fetchProductDetails();
    });

    this.filterForm.setValue(this.filterValues);
    this.sortForm.setValue(this.sortValues);
  }
  // This function will flatten the category tree into a list of categories.
  private flattenCategories(category: Category): Category[] {
    let flatList: Category[] = [];
    const traverse = (node: Category) => {
      flatList.push(node);
      node.children.forEach(traverse);
    };
    traverse(category);
    return flatList;
  }
  // This function will fetch the product details for each category. Only used for the initial load.
  private fetchProductDetails(): void {
    this.products = [];
    this.flattenedCategories.forEach((category) => {
      if (!category.id.startsWith('s')) {
        this.productService.getProduct(category.id).subscribe((product) => {
          if (product) {
            this.products.push(product);
            if (!this.categories[category.id]) {
              this.categories[category.id] = [];
            }
            this.categories[category.id].push(product);
          }
        });
      }
    });
  }
  // This function will apply the filters to the products list.
  applyFilters(filterValues: any): void {
    this.filteredProducts = this.products.filter((product) => {
      const price = parseFloat(product.extra['AGA'].PRI);
      const volume = parseFloat(product.extra['AGA'].VOL);
      const inStock = parseFloat(product.extra['AGA'].LGA) > 0;

      return (
        (filterValues.id ? product.id.toLowerCase().includes(filterValues.id.toLowerCase()) : true) &&
        (filterValues.name ? product.name.toLowerCase().includes(filterValues.name.toLowerCase()) : true) &&
        (filterValues.minPrice ? price >= filterValues.minPrice : true) &&
        (filterValues.maxPrice ? price <= filterValues.maxPrice : true) &&
        (filterValues.minVolume ? volume >= filterValues.minVolume : true) &&
        (filterValues.maxVolume ? volume <= filterValues.maxVolume : true) &&
        (filterValues.inStockOnly ? inStock : true)
      );
    });
  }

  setSortKey(sortKey: string): void {
    this.filteredProducts.sort((a, b) => {
      const aVal = a.extra['AGA'][sortKey];
      const bVal = b.extra['AGA'][sortKey];
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    });
  }

  applySort(sortValues: any): void {
    if (sortValues.sortKey) {
      this.setSortKey(sortValues.sortKey);
      if (sortValues.sortOrder === 'desc') {
        this.filteredProducts.reverse();
      }
      else {
        this.filteredProducts.reverse();
      }
    }
  }

  sortOrder(sortKey: string): void {
    this.sortValues.sortKey = sortKey;
    this.sortValues.sortOrder = this.sortValues.sortOrder === 'asc' ? 'desc' : 'asc';
    this.sortForm.setValue(this.sortValues);
    this.setSortKey(sortKey);
  }
}