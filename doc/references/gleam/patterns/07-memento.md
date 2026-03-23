# Episode 7: Memento

Episode 7: Memento
User Chad Bogue lost the message he was writing for two days. Implement save button for him.
Pedro: I don’t believe there are people who can type in textbox for two days. Two. Days.
Eve: Let’s save him.
Pedro: I googled this problem. Most popular approach to implement save button is Memento
pattern. You need originator, caretaker and memento objects.
Eve: What’s that?
Pedro: Originator is just an object or state that we want to preserve. (text inside a textbox),
caretaker is responsible to save state (save button) and memento is just an object to encapsulate
state.
public class TextBox {
// state for memento
private String text = "";
// state not handled by memento
private int width = 100;
private Color textColor = Color.BLACK;
public void type(String s) {
text += s;
}
public Memento save() {
return new Memento(text);
}
public void restore(Memento m) {
this.text = m.getText();
}
@Override
public String toString() {
return "[" + text + "]";
}
}
Pedro: Memento is just an immutable object
public final class Memento {
private final String text;
public Memento(String text) {
this.text = text;
}
public String getText() {
return text;
}
}
Pedro: And caretaker is a demo
// open browser, init empty textbox
TextBox textbox = new TextBox();
// type something into it
textbox.type("Dear, Madonna\n");
textbox.type("Let me tell you what ");
// press button save
Memento checkpoint1 = textbox.save();
// type again
textbox.type("song 'Like A Virgin' is about. ");
textbox.type("It's all about a girl...");
// suddenly browser crashed, restart it, reinit textbox
textbox = new TextBox();
// but it's empty! All work is gone!
// not really, you rollback to last checkpoint
textbox.restore(checkpoint1);
Pedro: Just a note if you want a multiple checkpoints, save memento’s to the list.
Eve: Originator, caretaker, memento - looks as a bunch of nouns, but actually it’s all about two
functions save and restore.
(def textbox (atom {}))
(defn init-textbox []
(reset! textbox {:text ""
:color :BLACK
:width 100}))
(def memento (atom nil))
(defn type-text [text]
(swap! textbox
(fn [m]
(update-in m [:text] (fn [s] (str s text))))))
(defn save []
(reset! memento (:text @textbox)))
(defn restore []
(swap! textbox assoc :text @memento))
Eve: And demo as well.
(init-textbox)
(type-text "'Like A Virgin' ")
(type-text "it's not about this sensitive girl ")
(save)
(type-text "who meets nice fella")
;; crash
(init-textbox)
(restore)
Pedro: It’s pretty the same code.
Eve: Yes, but you must care about memento immutability
Pedro: What does it mean?
Eve: You are lucky, that you got String object in this example, String is immutable. But if
you have something, that may change its internal state, you need to perform deep copy of this
object for memento.
Pedro: Oh, right. It’s just a recursive clone() calls to obtain prototype.
Eve: We will talk about Prototype in a minute, but just remember that Memento is not about
caretaker and originator, it is about save and restore.
