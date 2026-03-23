# Episode 9: Mediator

Episode 9: Mediator
Recently performed external code review shows a lot of issues with current codebase. Veerco
Wierde emphasizes tight coupling in chat application.
Eve: What is tight coupling?
Pedro: It’s the problem when objects know too much about each other.
Eve: Could you be more specific?
Pedro: Look at the current chat implementation
public class User {
private String name;
List<User> users = new ArrayList<User>();
public User(String name) {
this.name = name;
}
public void addUser(User u) {
users.add(u);
}
void sendMessage(String message) {
String text = String.format("%s: %s\n", name, message);
for (User u : users) {
u.receive(text);
}
}
private void receive(String message) {
// process message
}
}
Pedro: The problem here is the user knows everything about other users. It is very hard to use
and maintain such code. When new user connects to the chat, you must add a reference to him
via addUser for every existing user.
Eve: So, we just move one piece of responsibility to another class?
Pedro: Yes, kind of. We create mega-aware class, called mediator, that binds all parts together.
Obviously, each part knows only about mediator.
public class User {
String name;
private Mediator m;
public User(String name, Mediator m) {
this.name = name;
this.m = m;
}
public void sendMessage(String text) {
m.sendMessage(this, text);
}
public void receive(String text) {
// process message
}
}
public class Mediator {
List<User> users = new ArrayList<User>();
public void addUser(User u) {
users.add(u);
}
public void sendMessage(User u, String text) {
for (User user : users) {
u.receive(text);
}
}
}
Eve: That seems like a simple refactoring problem.
Pedro: Profit may be underestimated, but if you have hundreds of mutually connected
components (UI for example) mediator is really a savior.
Eve: Agreed.
Pedro: Now the clojure turn.
Eve: Ok…let’s look…your mediator is responsible for saving users and sending messages
(def mediator
(atom {:users []
:send (fn [users text]
(map #(receive % text) users))}))
(defn add-user [u]
(swap! mediator
(fn [m]
(update-in m [:users] conj u))))
(defn send-message [u text]
(let [send-fn (:send @mediator)
users (:users @mediator)]
(send-fn users (format "%s: %s\n" (:name u) text))))
(add-user {:name "Mister White"})
(add-user {:name "Mister Pink"})
(send-message {:name "Joe"} "Toby?")
Pedro: Good enough.
Eve: Nothing interesing here, because it is just a one approach to reduce coupling.
