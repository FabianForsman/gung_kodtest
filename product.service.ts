import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly products: { [s: string]: Product };

  constructor() {
    // While the data is stored inside the Service, the functions will "simulate" real API-call responses without having
    // to connect to one.
    this.products = JSON.parse(
      '{"AV300-1006": {"id": "AV300-1006","name": "Slangupprullare Avfettning 10m","children": [],"extra": {"AGA": {"APE": "      1","KAT": "TU","LGA": "       -1.00","PRI": "    4170.00","TYP": "","VOL": "    3.500","VPE": "   14.500","XP1": "          0","XP2": "          0"}}},"AV450-1006": {"id": "AV450-1006","name": "Slanguppr. avfettning 10m","children": [],"extra": {"AGA": {"APE": "      1","KAT": "TU","LGA": "       0.00","PRI": "    4115.00","TYP": "","VOL": "    2.700","VPE": "    0.000","XP1": "          0","XP2": "          0"}}},"AV430-1506": {"id": "AV430-1506","name": "Slangupprullare Avfettning 15m","children": [],"extra": {"AGA": {"APE": "      1","KAT": "TU","LGA": "       1.00","PRI": "    4875.00","TYP": "","VOL": "    5.300","VPE": "    0.000","XP1": "          0","XP2": "          0"}}},"VXL-10WK": {"id": "VXL-10WK","name": "Upprullare för avspärrning 10 m","children": [],"extra": {"AGA": {"APE": "      1","KAT": "TU","LGA": "       2.00","PRI": "    3050.00","TYP": "","VOL": "    1.700","VPE": "    0.000","XP1": "          0","XP2": "          0"}}},"VXL-15WK": {"id": "VXL-15WK","name": "Upprullare för avspärrning 15 m","children": [],"extra": {"AGA": {"APE": "      1","KAT": "TU","LGA": "       0.00","PRI": "    3420.00","TYP": "","VOL": "    3.200","VPE": "    0.000","XP1": "          0","XP2": "          0"}}},"VXL-20WK": {"id": "VXL-20WK","name": "Upprullare för avspärrning 20 m","children": [],"extra": {"AGA": {"APE": "      1","KAT": "TU","LGA": "       3.00","PRI": "    3830.00","TYP": "","VOL": "    1.100","VPE": "    0.000","XP1": "          0","XP2": "          0"}}},"8430-802": {"id": "8430-802","name": "Slanguppr. för Butan & Propan med 20m","children": [],"extra": {"AGA": {"APE": "      1","KAT": "SV","LGA": "       1.00","PRI": "    7170.00","TYP": "","VOL": "    5.200","VPE": "    0.000","XP1": "          0","XP2": "          0"}}},"8430-804": {"id": "8430-804","name": "Slanguppr. för Butan & Propan med 18m","children": [],"extra": {"AGA": {"APE": "      1","KAT": "SV","LGA": "       3.00","PRI": "    7200.00","TYP": "","VOL": "    7.500","VPE": "   20.200","XP1": "          0","XP2": "          0"}}}}'
    );
  }

  /***
   * getProduct retrieves product information for one product.
   * @param id id of the product you want to find information from.
   */
  public getProduct(id: string): Observable<Product> {
    return of(this.products[id]);
  }

  /**
   * Retrieves product information for one random product.
   */
  public getRandomProduct(id: string): Observable<Product> {
    var productKeys = Object.keys(this.products);
    var targetId = productKeys[this.hashcode(id) % productKeys.length];

    return of(this.products[targetId]);
  }

  private hashcode(id: string): number {
    var hash = 0,
      i,
      chr,
      len;
    if (id.length === 0) return hash;
    for (i = 0, len = id.length; i < len; i++) {
      chr = id.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

export interface Product {
  id: string;
  name: string;
  extra: { [s: string]: any };
}
