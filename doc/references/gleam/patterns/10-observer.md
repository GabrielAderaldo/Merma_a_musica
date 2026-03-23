# Episode 10: Observer

Episode 10: Observer
Independent security commision detected hacker Dartee Hebl has over a billion dollars balance on
his account. Track big transactions to the accounts.
Pedro: Are we Holmses?
Eve: No, but there is a lack of logging in the system, need to find a way to track all changes to
balance.
Pedro: We could add observers. Every time we modify balance, if change is big enough, notify
about this and track the reason. We need Observer interface
public interface Observer {
void notify(User u);
}
Pedro: And two specific observers
class MailObserver implements Observer {
@Override
public void notify(User user) {
MailService.sendToFBI(user);
}
}
class BlockObserver implements Observer {
@Override
public void notify(User u) {
DB.blockUser(u);
}
}
Pedro: Tracker class would be responsible for managing observers.
public class Tracker {
private Set<Observer> observers = new HashSet<Observer>();
public void add(Observer o) {
observers.add(o);
}
public void update(User u) {
for (Observer o : observers) {
o.notify(u);
}
}
}
Pedro: And the last part: init tracker with the user and modify its addMoney method. If
transcation amount is greaterthan 100$, notify FBI and block this user.
public class User {
String name;
double balance;
Tracker tracker;
public User() {
initTracker();
}
private void initTracker() {
tracker = new Tracker();
tracker.add(new MailObserver());
tracker.add(new BlockObserver());
}
public void addMoney(double amount) {
balance += amount;
if (amount > 100) {
tracker.update(this);
}
}
}
Eve: Why are you created two separate observers? You could use it in a one.
class MailAndBlock implements Observer {
@Override
public void notify(User u) {
MailService.sendToFBI(u);
DB.blockUser(u);
}
}
Pedro: Single responsibility principle.
Eve: Oh, yeah.
Pedro: And you can compose observer functionality dynamically.
Eve: I see your point.
;; Tracker
(def observers (atom #{}))
(defn add [observer]
(swap! observers conj observer))
(defn notify [user]
(map #(apply % user) @observers))
;; Fill Observers
(add (fn [u] (mail-service/send-to-fbi u)))
(add (fn [u] (db/block-user u)))
;; User
(defn add-money [user amount]
(swap! user
(fn [m]
(update-in m [:balance] + amount)))
;; tracking
(if (> amount 100) (notify)))
Pedro: It’s a pretty the same way?
Eve: Yeah, in fact observer is just a way to register function, which will be called after
another function.
Pedro: It is still the pattern.
Eve Sure, but we can improve solution a bit using clojure watches.
(add-watch
user
:money-tracker
(fn [k r os ns]
(if (< 100 (- (:balance ns) (:balance os)))
(notify))))
Pedro: Why is that better?
Eve: First of all, our add-money function is clean, it just adds money. Also, watcher tracks
every change to the state, not the ones we handle in mutator functions, like add-money
Pedro: Explain please.
Eve: If there is provided another secred method secret-add-money for changing balance,
watchers will handle that as well.
Pedro: That’s awesome!
