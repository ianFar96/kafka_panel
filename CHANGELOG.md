# Changelog

### Added

- Added logging system and logs over all major operations throughout the app
- Added high watermarks for topics to guess the number of messages

### Fixed

- Fixed problem with duplicated messages on Messages page
- Fixed problem with dangling messages listeners on Messages page

## 1.2.1

### Fixed

- Value headers are stringified only when they are not a string already

## 1.2.0

### Changed

- Various major style changes

### Fixed

- Fix code editor crashing on various edge cases
- Values are kept while moving between steps in the different steppers

### Added

- Support headers in messages throughout the entire application
- Selection components like "Select connection" show current selection

## 1.1.1

### Changed

- Migrate from dexie DB to file storage for settings and stored messages

### Fixed

- Fixed undefined messages sent counter when switching between pages back to running autosends

## 1.1.0

### Changed

- Messages page listens to new messages (unless stopped). New messages are displayed as they arrive maintaining always in page the number of messages defined in the settings.

## 1.0.0

### Added

- Added Autosends page: A page that let's you define auto sending message processes with all the customizations one can need 

### Fix

- When topic has messages without key or value, null is shown instead of an error

## 0.1.1

### Changed

- Refactor components with better organization
- New theme based on tailwind's colors

### Added

- Steppers for the multi step modals

## 0.1.0

### Added

- Messages storage page

## 0.0.4

### Fix

- Fix bug in release ci

## 0.0.3

### Fix

- Fix bug in release ci

## 0.0.2

### Fix

- Fix bug where upon hitting messages limit it didn't fetch the most recent messages

### Improved

- Improved performance on getting messages and used "silent" consumer

## 0.0.1

### Initial release

- First release of Kafka Panel