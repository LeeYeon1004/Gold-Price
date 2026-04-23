import { Directive, ElementRef, OnInit, OnDestroy, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import flatpickr from 'flatpickr';

@Directive({
  selector: '[appFlatpickr]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FlatpickrDirective),
      multi: true,
    },
  ],
})
export class FlatpickrDirective implements ControlValueAccessor, OnInit, OnDestroy {
  private fp: any;
  private onChange: (val: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private el: ElementRef) {}

  ngOnInit() {
    this.fp = flatpickr(this.el.nativeElement, {
      dateFormat: 'Y-m-d',
      allowInput: true,
      onChange: (dates: Date[], dateStr: string) => {
        this.onChange(dateStr);
        this.onTouched();
      },
    });
  }

  ngOnDestroy() {
    if (this.fp) this.fp.destroy();
  }

  // Called by Angular (ngModel) when value changes from outside
  writeValue(value: string) {
    if (!value) {
      if (this.fp) this.fp.clear();
      return;
    }
    // Normalize: strip time part if PostgreSQL returns ISO timestamp
    const dateStr = value.toString().slice(0, 10);
    if (this.fp) {
      this.fp.setDate(dateStr, false); // false = don't trigger onChange
    } else {
      // fp not ready yet, set on the element directly
      this.el.nativeElement.value = dateStr;
    }
  }

  registerOnChange(fn: (val: string) => void) { this.onChange = fn; }
  registerOnTouched(fn: () => void) { this.onTouched = fn; }
  setDisabledState(disabled: boolean) {
    this.el.nativeElement.disabled = disabled;
  }
}
