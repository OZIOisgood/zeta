import { TestBed } from '@angular/core/testing';
import { ZVideoPreviewComponent } from './z-video-preview.component';

describe('ZVideoPreviewComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZVideoPreviewComponent],
    }).compileComponents();
  });

  it('switches from the thumbnail to the animated gif while hovering', () => {
    const fixture = TestBed.createComponent(ZVideoPreviewComponent);
    fixture.componentRef.setInput(
      'thumbnail',
      'https://image.mux.com/playback-id/thumbnail.jpg?width=214&height=121',
    );
    fixture.detectChanges();

    const image = fixture.nativeElement.querySelector('[data-preview-image]') as HTMLElement;
    expect(image.style.backgroundImage).toContain('/thumbnail.jpg');

    fixture.componentInstance['hovered'].set(true);
    fixture.detectChanges();

    expect(image.style.backgroundImage).toContain('/animated.gif');
    expect(fixture.nativeElement.querySelector('[ngphover]').className).toContain(
      'overscroll-auto',
    );
  });
});
