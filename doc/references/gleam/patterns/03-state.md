# Episode 3: State

Episode 3. State
Sales person Karmen Git investigated the market and decided to provide user-specific functionality.
Pedro: Smooth requirements.
Eve: Let’s clarify them.
If user has subscription show him all news in a feed
Otherwise, show him only recent 10 news
If he pays money, add the amount to his account balance
If user doesn’t have subscription and there is enough money to buy subscription, change his
state to…
Pedro: State! Awesome pattern. First we make a user state enum
public enum UserState {
SUBSCRIPTION(Integer.MAX_VALUE),
NO_SUBSCRIPTION(10);
private int newsLimit;
UserState(int newsLimit) {
this.newsLimit = newsLimit;
}
public int getNewsLimit() {
return newsLimit;
}
}
Pedro: User logic is following
public class User {
private int money = 0;
private UserState state = UserState.NO_SUBSCRIPTION;
private final static int SUBSCRIPTION_COST = 30;
public List<News> newsFeed() {
return DB.getNews(state.getNewsLimit());
}
public void pay(int money) {
this.money += money;
if (state == UserState.NO_SUBSCRIPTION
&& this.money >= SUBSCRIPTION_COST) {
// buy subscription
state = UserState.SUBSCRIPTION;
this.money -= SUBSCRIPTION_COST;
}
}
}
Pedro: Lets call it
User user = new User(); // create default user
user.newsFeed(); // show him top 10 news
user.pay(10); // balance changed, not enough for subs
user.newsFeed(); // still top 10
user.pay(25); // balance enough to apply subscription
user.newsFeed(); // show him all news
Eve: You just hide value that affects behaviour inside User object. We could use strategy to
pass it directly user.newsFeed(subscriptionType).
Pedro: Agreed, State is very close to the Strategy. They even have the same UML diagrams. but
we encapsulate balance and bind it to user.
Eve: I think it achieves the same goal using another mechanism. Instead of providing strategy
explicitly, it depends on some state. From clojure perspective it can be implemented the same
way as strategy pattern.
Pedro: But successive calls can change object’s state.
Eve: Correct, but it has nothing to do with Strategy it is just implementation detail.
Pedro: What about “another mechanism”?
Eve: Multimethods.
Pedro: Multi what?
Eve: Look at this
(defmulti news-feed :user-state)
(defmethod news-feed :subscription [user]
(db/news-feed))
(defmethod news-feed :no-subscription [user]
(take 10 (db/news-feed)))
Eve: And pay function it’s just a plain function, which changes state of object. We don’t like
state too much in clojure, but if you wish.
(def user (atom {:name "Jackie Brown"
:balance 0
:user-state :no-subscription}))
(def ^:const SUBSCRIPTION_COST 30)
(defn pay [user amount]
(swap! user update-in [:balance] + amount)
(when (and (>= (:balance @user) SUBSCRIPTION_COST)
(= :no-subscription (:user-state @user)))
(swap! user assoc :user-state :subscription)
(swap! user update-in [:balance] - SUBSCRIPTION_COST)))
(news-feed @user) ;; top 10
(pay user 10)
(news-feed @user) ;; top 10
(pay user 25)
(news-feed @user) ;; all news
Pedro: Is dispatching by multimethods better than dispatching by enum?
Eve: No, in this particlular case, but in general yes.
Pedro: Explain, please
Eve: Do you know what double dispatch is?
Pedro: Not sure.
Eve: Well, it is topic for Visitor pattern.
