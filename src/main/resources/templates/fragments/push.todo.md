## Logo i popup


## Status checker


## Status:


#### Perm=Denied, Subscr:
  - "Subscribing, but permissin is blocked" / Enable --> ask  / Unsubscribe --> unsubscribe

#### Perm=Denied, NoSubscr:
  - "Not subscribing, and push notifications are blocked" / Subscribe --> ask + subscribe

#### Default:
  - "Checking permission and subscription..." / 



#### Perm=Default, NoSubscr:
  - "Not subscribing. Permission is not determined" / Subscribe --> subscribe

#### Perm=Default, Subscr:
  - "Subscribing, but permission is not determined" / Ask permission --> ask / Unsubscribe --> unsubscribe + block



#### Perm=Allow, Subscr:
  - "Subscribing to notifications" / Unsubscribe --> unsubscribe + block


#### Perm=Allow, NoSubscr:
  - "Not subscribing, but permission allowed" / Block --> block / Subscribe --> subscribe




## Status change listener
