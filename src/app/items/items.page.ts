import { Component, OnInit, OnDestroy, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { ItemService } from '../services/item.service';
import { Subscription, BehaviorSubject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { AnalyticsService } from '../services/analytics.service';
import {
  StackConfig,
  Stack,
  Card,
  ThrowEvent,
  DragEvent,
  SwingStackComponent,
  SwingCardComponent
} from 'angular2-swing';

@Component({
  selector: 'app-items',
  templateUrl: 'items.page.html',
  styleUrls: ['items.page.scss']
})
export class ItemsPage implements OnInit, OnDestroy {
  @ViewChild('mystack') swingStack: SwingStackComponent;
  @ViewChildren('mycards') swingCards: QueryList<SwingCardComponent>;

  userSub: Subscription;
  itemSub: Subscription;
  items: any[];
  roundOfItems: any[];

  itemLimit: number = 10;
  page: number = 1;

  count: number = 0;
  updateSwipeCount$: BehaviorSubject<number> = new BehaviorSubject(0);

  stackConfig: StackConfig;
  recentCard: string;
  debouncer: any;

  constructor(
    public itemService: ItemService,
    private authService: AuthService,
    private analyticsService: AnalyticsService) {
      this.stackConfig = {
        throwOutConfidence: (offsetX, offsetY, element) => {
          return Math.min(Math.abs(offsetX) / (element.offsetWidth / 3), 1);
        },
        transform: (element, x, y, r) => {
          this.onItemMove(element, x, y, r);
        }
      };
    }

  ngOnInit() {
    this.userSub = this.authService.user$.subscribe(user => {
      this.count = user && user.swipes ? user.swipes : 0;
    });

    this.itemSub = this.itemService.items$.subscribe((items: any[]) => {
      if (items && items.length) {
        this.items = items;
        this.roundOfItems = items.filter((item, index) => index < this.itemLimit);
        // this.swingStack.throwin.subscribe((event: DragEvent) => {
        //   event.target.style.background = '#ffffff';
        // });
      }
    });

    this.updateSwipeCount$.pipe(
      debounceTime(777)
    ).subscribe((num: number) => {
      if (this.count) {
        this.authService.updateUserDoc({ swipes: this.count });
      }
    });
  }

  // Called whenever we drag an element
  onItemMove(element, x, y, r) {
    let color = '';
    const abs = Math.abs(x);
    let min = Math.trunc(Math.min(16 * 16 - abs, 16 * 16));
    let hexCode = this.decimalToHex(min, 2);

    if (x < 0) {
      color = '#FF' + hexCode + hexCode;
    } else {
      color = '#' + hexCode + 'FF' + hexCode;
    }

    // element.style.background = color;
    element.style['transform'] = `translate3d(0, 0, 0) translate(${x}px, ${y}px) rotate(${r}deg)`;
  }

  decimalToHex(d, padding) {
    // http://stackoverflow.com/questions/57803/how-to-convert-decimal-to-hex-in-javascript
    let hex = Number(d).toString(16);
    padding = typeof (padding) === 'undefined' || padding === null ? padding = 2 : padding;

    while (hex.length < padding) {
      hex = '0' + hex;
    }

    return hex;
  }

  vote(like: boolean) {
    const removedCard = this.roundOfItems.pop();

    this.recentCard = like ? `${removedCard.name} Saved` : `${removedCard.name} Skipped`;

    this.itemService.saveItem(removedCard);

    this.analyticsService.swipe();

    this.count++;
    this.updateSwipeCount$.next(this.count);

    if (this.debouncer) {
      clearTimeout(this.debouncer);
    }

    this.debouncer = setTimeout(() => {
      this.recentCard = null;
    }, 7777);
  }

  viewDetails(item: any) {
    this.analyticsService.viewDetails();
    this.itemService.selected$.next(item);
  }

  skipAd() {
    this.page++;
    this.roundOfItems = this.items.filter((item, index) => {
      return index > ((this.page - 1) * this.itemLimit) && index < (this.itemLimit * this.page);
    });
  }

  ngOnDestroy() {
    this.itemSub.unsubscribe();
    this.userSub.unsubscribe();
  }
}
