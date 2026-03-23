# Episode 2: Strategy

Episode 2. Strategy
Sven Tori pays a lot of money to see a page with list of users. But users must be sorted by name and
users with subscription must appear before all other users. Obviously, because they pay. Reverse
sorting should keep subscripted users on top.
Pedro: Ha, just call Collections.sort(users, comparator) with custom
comparator.
Eve: How would you implement custom comparator?
Pedro: You need to take Comparator interface and provide implementation for
compare(Object o1, Object o2) method. Also you need another implementation for
ReverseComparator
Eve: Stop talking, show me the code!
class SubsComparator implements Comparator<User> {
@Override
public int compare(User u1, User u2) {
if (u1.isSubscription() == u2.isSubscription()) {
return u1.getName().compareTo(u2.getName());
} else if (u1.isSubscription()) {
return -1;
} else {
return 1;
}
}
}
class ReverseSubsComparator implements Comparator<User> {
@Override
public int compare(User u1, User u2) {
if (u1.isSubscription() == u2.isSubscription()) {
return u2.getName().compareTo(u1.getName());
} else if (u1.isSubscription()) {
return -1;
} else {
return 1;
}
}
}
// forward sort
Collections.sort(users, new SubsComparator());
// reverse sort
Collections.sort(users, new ReverseSubsComparator());
Pedro: Could you do the same?
Eve: Yeah, something like that
(sort (comparator
(fn [u1 u2]
(cond
(= (:subscription u1)
(:subscription u2)) (neg? (compare (:name u1)
(:name u2)))
(:subscription u1) true
:else false))) users)
Pedro: Pretty similar.
Eve: But we can do it better
;; forward sort
(sort-by (juxt (complement :subscription) :name) users)
;; reverse sort
(sort-by (juxt :subscription :name) #(compare %2 %1) users)
Pedro: Oh my gut! Monstrous oneliners.
Eve: Functions, you know.
Pedro: Whatever, it’s very hard to understand what’s happening there.
Eve explains juxt, complement and sort-by
10 minutes later
Pedro: Very doubtful approach to pass strategy.
Eve: I don’t care, because Strategy is just a function passed to another function.
