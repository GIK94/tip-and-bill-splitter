# User Stories with Acceptance Criteria

How the app helps each role get its jobs done. Every story names the job it serves ([Jobs To Be Done](jobs-to-be-done.md)), and every job belongs to a role ([App Roles](app-roles.md)).

**Status** reflects what the app does today: **Implemented** means every acceptance criterion below passes in the current app; **Not implemented** means the story is planned but not built.

Conventions used in the criteria:

- "Calculator" is the modal that opens from **Start splitting** on Home (or **New split** / **Edit a copy** in History).
- Amounts may be typed as `54`, `54.5`, `54.00`, `$54.00` or `1,054.00`. Money is limited to 2 decimal places and $99,999.99.
- Quoted text is the exact message the app shows.

## Summary

| Story | Role | Serves | Status |
|---|---|---|---|
| [S-1 Split a bill evenly](#s-1-split-a-bill-evenly) | Guest Diner | J-1 | Implemented |
| [S-2 Split a bill by what each person ordered](#s-2-split-a-bill-by-what-each-person-ordered) | Guest Diner | J-2 | Implemented |
| [S-3 Choose the tip](#s-3-choose-the-tip) | Guest Diner | J-3 | Implemented |
| [S-4 Shares that add up exactly](#s-4-shares-that-add-up-exactly) | Guest Diner | J-4 | Implemented |
| [S-5 Result always matches the inputs](#s-5-result-always-matches-the-inputs) | Guest Diner | J-4 | Implemented |
| [S-6 Send the result as text](#s-6-send-the-result-as-text) | Guest Diner | J-5 | Implemented |
| [S-7 Download the result as an image or PDF](#s-7-download-the-result-as-an-image-or-pdf) | Guest Diner | J-5 | Implemented |
| [S-8 Round shares up for cash](#s-8-round-shares-up-for-cash) | Guest Diner | J-6 | Not implemented |
| [S-9 Tip on the amount before tax](#s-9-tip-on-the-amount-before-tax) | Guest Diner | J-3 | Not implemented |
| [S-10 Create an account](#s-10-create-an-account) | Registered Diner | J-7 | Implemented |
| [S-11 Log in and log out](#s-11-log-in-and-log-out) | Registered Diner | J-10 | Implemented |
| [S-12 Save a result](#s-12-save-a-result) | Registered Diner | J-7 | Implemented |
| [S-13 Look back at saved results](#s-13-look-back-at-saved-results) | Registered Diner | J-7 | Implemented |
| [S-14 Start from a saved result](#s-14-start-from-a-saved-result) | Registered Diner | J-8 | Implemented |
| [S-15 Delete a saved result](#s-15-delete-a-saved-result) | Registered Diner | J-9 | Implemented |
| [S-16 Keep saved results private](#s-16-keep-saved-results-private) | Registered Diner | J-10 | Implemented |
| [S-17 Reset a forgotten password](#s-17-reset-a-forgotten-password) | Registered Diner | J-11 | Not implemented |

---

## S-1 Split a bill evenly

**Serves:** J-1 · **Role:** Guest Diner · **Status:** Implemented

> As a Guest Diner, I want to enter the bill, the tip and the number of people and see what each person pays, so that the group can settle up at the table without anyone doing the maths.

**Normal case**
- Given I chose **Even** on Home and pressed **Start splitting**, when the calculator opens, then the tip is set to 15 % and the number of people is 2.
- Given a bill of $100.00, an 18 % tip and 3 people, when I press **Calculate**, then I see Tip $18.00 and Grand total $118.00, and the rows Person 1 / Person 2 / Person 3 pay $39.34 / $39.33 / $39.33, with tip shares $6.00 each and bill shares $33.34 / $33.33 / $33.33.
- Given a bill of $42.50, a 20 % tip and 1 person, when I press Calculate, then Person 1 pays the whole $51.00.

**Invalid input**
- Given the bill field is empty, when I press Calculate, then I see "Enter the bill amount." under the bill, "Please fix the highlighted fields." above the button, and no result.
- Given I type `12.345`, `-5` or `abc` as the bill, when I press Calculate, then I see "Enter an amount like 54.00." and no result.
- Given the number of people field is empty, when I press Calculate, then I see "Number of people must be between 1 and 50." and no result.

**Boundary values**
- Given a bill of `0` or `0.00`, when I press Calculate, then I see "Enter a bill amount between $0.01 and $99,999.99." and no result.
- Given a bill of `100000`, when I press Calculate, then I see "Enter a bill amount between $0.01 and $99,999.99." and no result.
- Given I type `0` in Number of people, when I leave the field, then it changes to 1; given I type `51`, when I leave the field, then it changes to 50.
- Given a bill of $1.00, a 0 % tip and 50 people, when I press Calculate, then 50 rows are shown and each person pays $0.02.

**Very large and very small values**
- Given a bill of $99,999.99, a custom tip of 100 % and 3 people, when I press Calculate, then the grand total is $199,999.98 and each person pays $66,666.66 (bill $33,333.33 + tip $33,333.33).
- Given a bill of $0.01, a 0 % tip and 3 people, when I press Calculate, then Person 1 pays $0.01 and Persons 2 and 3 pay $0.00.

**After an error is corrected**
- Given the bill shows "Enter an amount like 54.00.", when I change the bill, then that message disappears; when I then press Calculate with a valid bill, then the result appears and no error message is shown.

**Layout**
- Given a phone screen 360 px wide, when I use the calculator, then every field and button is usable without scrolling sideways, and the Home illustration is hidden.

---

## S-2 Split a bill by what each person ordered

**Serves:** J-2 · **Role:** Guest Diner · **Status:** Implemented

> As a Guest Diner, I want to list the people and the items each of them had, so that everyone pays for their own food plus a fair part of the tax and tip.

**Normal case**
- Given I chose **Itemised** and pressed Start splitting, when the calculator opens, then it lists "Person 1" and "Person 2" and one empty item.
- Given a bill of $54.00, a 20 % tip, Pasta $20.00 (Alice), Steak $25.00 (Bob) and Fries $6.00 (Alice, Bob, Cara), when I press Calculate, then I see Items total $51.00, Tax & fees $3.00, Tip (20%) $10.80 and Grand total $64.80, and:

  | Person | Bill | Tip | Pays |
  |---|---|---|---|
  | Alice | $23.29 | $4.66 | $27.95 |
  | Bob | $28.59 | $5.72 | $34.31 |
  | Cara | $2.12 | $0.42 | $2.54 |
- Given an item, when I press **Everyone** next to it, then every person is assigned to that item.
- Given an item named blank, when I press Calculate, then the result lists it as "Item 1" (its position).
- Given an item priced $0.00 that is assigned to someone, when I press Calculate, then the result is produced and that item adds nothing to anyone's share.

**Warnings (a result is still produced)**
- Given the same items with a bill of $48.00, when I press Calculate, then I see "Items add up to $51.00, more than the bill. Shares were scaled down proportionally.", the summary shows Discount -$3.00, and Alice / Bob / Cara pay $24.85 / $30.49 / $2.26 (total $57.60).
- Given a fourth person "Dan" who is assigned to no item, when I press Calculate, then I see "Dan has no items and pays $0.00." and Dan's row shows $0.00.

**Invalid input (no result is produced)**
- Given an item with nobody assigned, when I press Calculate, then that item shows "Assign this item to at least one person."
- Given people named "Alice" and "alice " (different case, extra space), when I press Calculate, then the second shows "Each person needs a different name."
- Given a person's name is empty or only spaces, when I press Calculate, then that name shows "Name must be 1–30 characters."
- Given an item price is empty, when I press Calculate, then it shows "Enter a price."; given it is `abc`, then it shows "Enter a price like 12.50."
- Given every item is priced $0.00, when I press Calculate, then I see "Add at least one item with a price above $0.00."

**Boundary values**
- Given there is only one person (or only one item), when I look at its remove button, then it is disabled.
- Given there are 50 people, then **Add person** is disabled; given there are 100 items, then **Add item** is disabled.
- Given I type a person name, when it reaches 30 characters, then no more characters are accepted (40 for item names).
- Given I remove a person who was assigned to items, when I look at those items, then that person is no longer assigned.

**Very large values**
- Given a bill of $99,999.99 and one item priced $99,999.99 shared by 3 people, when I press Calculate, then the three shares differ by at most 1¢ and add up to the grand total.

**After an error is corrected**
- Given an item shows "Assign this item to at least one person.", when I assign someone to it, then the message disappears; when I press Calculate, then the result appears.

---

## S-3 Choose the tip

**Serves:** J-3 · **Role:** Guest Diner · **Status:** Implemented

> As a Guest Diner, I want to pick a common tip percentage, type my own percentage, or enter a fixed tip amount, so that the tip is exactly what I intended.

**Normal case**
- Given the calculator is open, when I look at the tip options, then I can choose 0%, 10%, 15%, 18%, 20%, **Custom %** or **Fixed $**, and 15% is selected.
- Given a bill of $80.00 and Custom % `12.5`, when I press Calculate, then the tip is $10.00 and the summary says "Tip (12.5%)".
- Given a bill of $30.00 and a fixed tip of $0.00 (or the 0% preset), when I press Calculate, then every tip share is $0.00.

**Rounding**
- Given a bill of $10.05 and a 15 % tip, when I press Calculate, then the tip is $1.51 ($1.5075 rounded half up).

**Warning (a result is still produced)**
- Given a bill of $20.00 and a fixed tip of $25.00, when I press Calculate, then I see "The tip is larger than the bill." and a result with grand total $45.00.

**Invalid input and boundaries**
- Given Custom % is `100`, when I press Calculate, then the result is produced with a tip equal to the bill.
- Given Custom % is `100.01` or `150`, when I press Calculate, then I see "Tip percentage must be between 0 and 100." and no result.
- Given Custom % is empty, `12.555` or `abc`, when I press Calculate, then I see "Enter a percentage like 12.5." and no result.
- Given Fixed $ is empty or `abc`, when I press Calculate, then I see "Enter a tip amount like 10.00."; given it is `100000`, then I see "Tip amount must be between $0.00 and $99,999.99."

**After an error is corrected**
- Given the tip shows an error, when I change the tip value or pick another tip option, then the error disappears; when I press Calculate with a valid tip, then the result appears.

---

## S-4 Shares that add up exactly

**Serves:** J-4 · **Role:** Guest Diner · **Status:** Implemented

> As a Guest Diner, I want every share rounded to the cent with leftover cents shared out fairly, so that the shares add up exactly to the total and nobody pays noticeably more than their share.

- Given any valid even or itemised calculation, when the result is shown, then the Bill, Tip and Pays columns each add up exactly to the bill, the tip and the grand total shown in the **Total** row.
- Given any valid calculation, when the result is shown, then no person's bill share, tip share or total is more than 1¢ away from their exact (unrounded) share.
- Given $100.00, 18 % and 3 people (exact share $39.333…), when I press Calculate, then the extra 1¢ goes to Person 1, the first-listed of the tied people.
- Given a bill of $99,999.99, a 100 % tip and 50 people, when I press Calculate, then Persons 1–48 pay $4,000.00, Persons 49–50 pay $3,999.99, and the total is $199,999.98.
- Given the same inputs, when I press Calculate again, then I get exactly the same shares.

---

## S-5 Result always matches the inputs

**Serves:** J-4 · **Role:** Guest Diner · **Status:** Implemented

> As a Guest Diner, I want the result to appear only when I ask for it and to disappear as soon as I change something, so that I never share or save numbers that don't match what I entered.

- Given I have filled in valid inputs, when I have not pressed Calculate, then no result is shown.
- Given a result is shown, when I change any input (bill, tip, people, items or split method), then the result and its Save and Share buttons disappear until I press Calculate again.
- Given a result has warnings, when it is shown, then the warnings appear above the per-person table.
- Given I entered inputs or a result, when I close the calculator and open it again, then it starts empty with the defaults.

---

## S-6 Send the result as text

**Serves:** J-5 · **Role:** Guest Diner · **Status:** Implemented

> As a Guest Diner, I want to send the breakdown to the group chat or copy it as text, so that everyone sees the same numbers.

- Given a result for $100.00, 18 %, 3 people, when I press **Copy text**, then I see "Result copied. Paste it into any chat." and the clipboard holds:

  ```text
  Tip & Bill Split — Even split
  Bill: $100.00 · Tip (18%): $18.00 · Total: $118.00
  Person 1: $39.34
  Person 2: $39.33
  Person 3: $39.33
  ```
- Given a result, when I press **WhatsApp**, then a new tab opens `https://wa.me/?text=…` with that text filled in.
- Given the browser blocks the new tab, when I press WhatsApp, then a dialog "WhatsApp is unavailable" says "Couldn't open WhatsApp. Copy the result text and paste it into any chat." with a **Copy text** button; when I press it, then the text is copied and the dialog closes.
- Given the browser denies clipboard access, when I press Copy text, then a dialog says "Your browser didn't allow automatic copying. Select the text below and copy it." and shows the text, already selected, in a read-only box.
- Given a saved result with a title, when I copy its text from History, then the title appears on the second line.

---

## S-7 Download the result as an image or PDF

**Serves:** J-5 · **Role:** Guest Diner · **Status:** Implemented

> As a Guest Diner, I want to download the result as an image or a PDF, so that I can post it anywhere or keep a copy.

- Given a result, when I press **Image**, then a PNG of the result card downloads as `bill-split-YYYY-MM-DD.png` (today's local date).
- Given a result, when I press **PDF**, then `bill-split-YYYY-MM-DD.pdf` downloads with the split method, the summary, the per-person table and, if there were warnings, a "Notes" list.
- Given a saved result opened from History, when I press PDF, then the PDF also shows its title and "Saved" date and time.
- Given the file cannot be created, when I press Image or PDF, then I see "Couldn't create the image. Please try again." or "Couldn't create the PDF. Please try again." and the result stays on screen.

---

## S-8 Round shares up for cash

**Serves:** J-6 · **Role:** Guest Diner · **Status:** Not implemented

> As a Guest Diner, I want to round each person's share up to a whole dollar, so that friends paying cash don't need small change.

- Given $100.00, 18 % and 3 people, when I turn on "Round up to $1", then each person pays $40.00 and the extra $2.02 is shown as added tip.
- Given rounding is on and the shares are already whole dollars, when I press Calculate, then nothing is added.

---

## S-9 Tip on the amount before tax

**Serves:** J-3 · **Role:** Guest Diner · **Status:** Not implemented

> As a Guest Diner, I want to enter the tax separately and tip only on the amount before tax, so that I tip the way local custom expects.

- Given a bill of $108.00 including $8.00 tax and an 18 % tip on the pre-tax amount, when I press Calculate, then the tip is $18.00 and the grand total is $126.00.
- Given the tax is larger than the bill, when I press Calculate, then I see an error and no result.

---

## S-10 Create an account

**Serves:** J-7 · **Role:** Registered Diner · **Status:** Implemented

> As a Registered Diner, I want to create an account with my name, email and password, so that I have somewhere to keep the splits I need to follow up on.

**Normal case**
- Given I am a guest, when I press **Sign Up** in the header, then a "Sign up" modal opens on top of the current page.
- Given a valid name, a new email, password `dinner123` and the same confirmation, when I press **Create account**, then the modal closes, I see "Your account is ready.", I stay on the same page, and the header shows my name and a History link.

**Invalid input**
- Given an email that already has an account (in any letter case), when I press Create account, then I see "An account with this email already exists."
- Given the email `alice@`, when I press Create account, then I see "Enter a valid email address."
- Given password `dinnertime`, then I see "Password must contain at least one number."; given `12345678`, then "Password must contain at least one letter."
- Given the confirmation differs from the password, then I see "Passwords do not match."
- Given the name is empty or only spaces, then I see "Enter your name."

**Boundary values**
- Given a 7-character password `abcde12`, then I see "Password must be 8–72 characters."; given the 8-character `abcdef12`, then the account is created.
- Given a 73-character password, then I see "Password must be 8–72 characters."
- Given I type a name, when it reaches 50 characters, then no more characters are accepted.

**After an error is corrected**
- Given I saw "Passwords do not match.", when I fix the confirmation and press Create account, then the account is created.

---

## S-11 Log in and log out

**Serves:** J-10 · **Role:** Registered Diner · **Status:** Implemented

> As a Registered Diner, I want to log in to reach my records and log out when I'm done, so that nobody else using the device can see them.

- Given I am a guest, when I press **Login** and enter my correct email and password, then the modal closes, I see "Welcome back!" and the header shows my name and History.
- Given a wrong password or an unknown email, when I press Log in, then I see "Email or password is incorrect." (the message does not say which one was wrong).
- Given an empty email, then I see "Enter your email."; given an empty password, then "Enter your password."
- Given 10 sign-up or login attempts from my network in the last minute, when I try again, then I see "Too many attempts. Please wait a minute and try again."; after a minute, I can log in normally.
- Given I am logged in, when I choose **Logout** from the menu under my name, then I see "You have been logged out.", I am on Home, and the header shows Login and Sign Up again.
- Given I am logged in and 24 hours have passed, when I do something that needs my account, then I see "Your session has expired. Please log in again." and the Log in modal opens.
- Given I open the Log in modal, when I press **Create an account**, then it switches to Sign up (and **Log in** switches back).

---

## S-12 Save a result

**Serves:** J-7 · **Role:** Registered Diner · **Status:** Implemented

> As a Registered Diner, I want to save a result with an optional title, so that I can check later who still owes me.

- Given I am a guest with a result, when I look under it, then there is no Save button; I see "Log in or sign up to save this result." instead.
- Given I am a guest with a result, when I press **Log in** in that message and log in, then the calculator and the result are still there and a **Save** button is shown.
- Given I am logged in with a result, when I press Save, type "Friday dinner" and confirm, then the calculator closes, I see "Saved to your history.", and the entry appears in History.
- Given I leave the title empty, when I save, then the entry is listed as "Even split" or "Itemised split".
- Given I type a title, when it reaches 60 characters, then no more characters are accepted and the counter shows 60 / 60.
- Given I calculated but did not press Save, when I close the calculator, then nothing is added to History.
- Given I save the same result twice, then History shows two separate entries.
- Given the server is unreachable, when I confirm Save, then I see "Could not reach the server. Check your connection and try again.", the title dialog stays open and my result is kept; when the connection is back and I confirm again, then it saves.

---

## S-13 Look back at saved results

**Serves:** J-7 · **Role:** Registered Diner · **Status:** Implemented

> As a Registered Diner, I want to see my saved results grouped by date and open any of them, so that I can find the meal I'm chasing payment for.

- Given I have saved results, when I open **History**, then they are grouped under "Today", "Yesterday" and then dates such as "Mon, Oct 27, 2026", newest first.
- Given a saved result, when I look at its row, then I see its title (or "Even split" / "Itemised split"), the grand total, the method, the number of people (e.g. "3 people", "1 person") and the time saved.
- Given I select a row, when the "Saved calculation" window opens, then it shows the result exactly as saved (summary, per-person table, items, warnings, "Saved" date) with **Edit a copy** and the share buttons, and nothing in it can be edited.
- Given I have no saved results, when I open History, then I see "No saved calculations yet" and a **Start a new split** button.
- Given History cannot be loaded, when I open it, then I see an error with a **Retry** button; when I press Retry and the server is back, then the list appears.

---

## S-14 Start from a saved result

**Serves:** J-8 · **Role:** Registered Diner · **Status:** Implemented

> As a Registered Diner, I want to open a copy of a saved result in the calculator, so that I can fix or reuse it without typing everything again.

- Given a saved itemised result with a custom 12.5 % tip, when I press **Edit a copy**, then the calculator opens titled "Edit a copy" with the same method, bill, Custom % 12.5, people, items and assignments filled in, and no result shown.
- Given I change the bill in the copy, press Calculate and Save, then History has a new entry with the new total, and the original entry still shows its old total.

---

## S-15 Delete a saved result

**Serves:** J-9 · **Role:** Registered Diner · **Status:** Implemented

> As a Registered Diner, I want to delete a saved result I no longer need, so that History only holds records I trust.

- Given a saved result "Friday dinner" of $118.00, when I press its delete (bin) button, then I see "Delete this calculation?" with "“Friday dinner” ($118.00) will be permanently removed from your history. This can't be undone." and **Cancel** / **Delete**; the details window does not open.
- Given that dialog, when I press Cancel, then the entry stays in History.
- Given that dialog, when I press Delete, then the entry disappears, I see "Calculation deleted.", and it is still gone after reloading the page.
- Given deleting fails because of a server error, when I press Delete, then I see "Could not delete. Please try again." and the entry stays in the list.

---

## S-16 Keep saved results private

**Serves:** J-10 · **Role:** Registered Diner · **Status:** Implemented

> As a Registered Diner, I want only me to be able to see and delete my saved results, so that what my friends owe me stays private.

- Given two users each saved results, when either opens History, then they see only their own results.
- Given I request another user's saved result by its ID (in the app or through the API), then I get "not found" (HTTP 404), the same as for an ID that doesn't exist; deleting it also returns 404 and it is not deleted.
- Given I am a guest, when I go to `/history`, then I am taken to Home with the Log in modal open; when I log in, then History opens.
- Given I am a guest, when I call any saved-results API, then I get HTTP 401 and no data.
- Given a save request that includes its own `result`, when it is sent to the API, then it is rejected; the stored result is always calculated by the server from the inputs.

---

## S-17 Reset a forgotten password

**Serves:** J-11 · **Role:** Registered Diner · **Status:** Not implemented

> As a Registered Diner, I want to reset my password through a link sent to my email, so that I can get back to my saved results if I forget it.

- Given I press "Forgot password?" and enter my email, when I submit, then I see the same confirmation whether or not the email has an account.
- Given I open a valid reset link within 1 hour, when I enter a new valid password, then I can log in with it and my saved results are unchanged.
- Given a reset link older than 1 hour or already used, when I open it, then I see that it has expired and can request a new one.
