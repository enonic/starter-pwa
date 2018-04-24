## Logo i popup


## Status checker


## Status:


#### Default:
  - "Checking permission and subscription..." / 

#### Perm=Ask, NoSubscr:
  - "Not subscribing. Permission is not determined" / Subscribe --> subscribe

#### Perm=Allow, NoSubscr:
  - "Not subscribing, but permission allowed" / Block --> block / Subscribe --> subscribe

#### Perm=Block, NoSubscr:
  - "Not subscribing, and push notifications are blocked" / Subscribe --> ask + subscribe

#### Perm=Ask, Subscr:
  - "Subscribing, but permission is not determined" / Ask permission --> ask / Unsubscribe --> unsubscribe + block

#### Perm=Block, Subscr:
  - "Subscribing, but permissin is blocked" / Enable --> ask  / Unsubscribe --> unsubscribe

#### Perm=Allow, Subscr:
  - "Subscribing to notifications" / Unsubscribe --> unsubscribe + block




## Status change listener
