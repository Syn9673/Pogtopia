# Server.dat
This file is where necessary stuff that don't need to be saved in the database is put. For example the last user id. More will be added soon.  

## Structure
```c
typedef struct {
	char[8] header;			// the word "POGTOPIA"
	uint32_t availableUserID;	// available user id
} ServerDat;
```