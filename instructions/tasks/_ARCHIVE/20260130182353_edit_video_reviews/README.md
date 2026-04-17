# Edit Video Reviews

## Context
See `instructions/CONSTITUTION.md`.

## Requirements

### User Story
As a user, I expect to have an ability to edit comments for videos.

### Developer Requirements

1.  **Frontend**:
    - Add a new option to the comment-dropdown with an icon.
    - On click, a dialog with a text area should be opened.
    - Use the Taiga UI declarative directive `[(tuiDialog)]` for the dialog as shown in the example below.

2.  **Backend**:
    - Permission slug: `reviews:edit`.
    - This permission should be assigned to `admin` and `expert` roles.
    - Implement an endpoint to update the review comment.

### Reference Implementation (Frontend)
```html
<button
    size="m"
    tuiButton
    tuiHint="Some text"
    tuiHintDirection="top"
    type="button"
    (click)="showDialog()"
>
    Show
</button>
<ng-template
    let-observer
    [tuiDialogOptions]="{label: 'Edit comment', size: 's'}"
    [(tuiDialog)]="open"
>
    <form
        [formGroup]="form"
        (ngSubmit)="observer.complete()"
    >
        <tui-input
            formControlName="content"
            tuiAutoFocus
        >
            Comment
        </tui-input>
        <p>
            <button
                tuiButton
                type="submit"
            >
                Save
            </button>
        </p>
    </form>
</ng-template>
```

```typescript
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {TuiAutoFocus} from '@taiga-ui/cdk';
import {TuiButton, TuiDialog, TuiHint} from '@taiga-ui/core';
import {TuiInputModule} from '@taiga-ui/legacy';

@Component({
    standalone: true,
    imports: [
        ReactiveFormsModule,
        TuiAutoFocus,
        TuiButton,
        TuiDialog,
        TuiHint,
        TuiInputModule,
    ],
    // ...
})
export class Example {
    protected form = new FormGroup({
        content: new FormControl(''),
    });

    protected open = false;

    protected showDialog(): void {
        this.open = true;
    }
}
```
