# Episode 4: Visitor

Episode 4. Visitor
Natanius S. Selbys suggested to implement functionality which allows users export their messages,
activities and achievements in different formats.
Eve: So, how do you plan to do it?
Pedro: We have one hierarchy for item types (Message, Activity) and another for file formats
(PDF, XML)
abstract class Format { }
class PDF extends Format { }
class XML extends Format { }
public abstract class Item {
void export(Format f) {
throw new UnknownFormatException(f);
}
abstract void export(PDF pdf);
abstract void export(XML xml);
}
class Message extends Item {
@Override
void export(PDF f) {
PDFExporter.export(this);
}
@Override
void export(XML xml) {
XMLExporter.export(this);
}
}
class Activity extends Item {
@Override
void export(PDF pdf) {
PDFExporter.export(this);
}
@Override
void export(XML xml) {
XMLExporter.export(this);
}
}
Pedro: That’s all.
Eve: Nice, but how do you dispatch on argument type?
Pedro: What the problem?
Eve: Consider this snippet
Item i = new Activity();
Format f = new PDF();
i.export(f);
Pedro: Nothing suspicious here.
Eve: Actually, if you run this code you get UnknownFormatException
Pedro: Wait…Really?
Eve: In java you can use only single dispatch. That means if you call i.export(f) you
dispatches on the actual type of i, not f.
Pedro: I’m surprised. So, there is no dispatch on argument type?
Eve: That’s what visitor hack for. After you got a dispatch on i type, you additionally call
f.someMethod(i) and dispatched on f type.
Pedro: How that looks in code?
Eve: You separately define export operations for all types as a Visitor
public interface Visitor {
void visit(Activity a);
void visit(Message m);
}
public class PDFVisitor implements Visitor {
@Override
public void visit(Activity a) {
PDFExporter.export(a);
}
@Override
public void visit(Message m) {
PDFExporter.export(m);
}
}
Eve: Your items change signature to accept different visitors.
public abstract class Item {
abstract void accept(Visitor v);
}
class Message extends Item {
@Override
void accept(Visitor v) {
v.visit(this);
}
}
class Activity extends Item {
@Override
void accept(Visitor v) {
v.visit(this);
}
}
Eve: To use it you may call
Item i = new Message();
Visitor v = new PDFVisitor();
i.accept(v);
Eve: And everything works fine. Moreover, you can add new operations for activities and
messages by just defining new visitors and without changing their code.
Pedro: That’s really useful. But implementation is tough, it is the same for clojure?
Eve: Not really, clojure supports it natively via multimethods
Pedro: Multi what?
Eve: Just follow the code… First we define dispatcher function
(defmulti export
(fn [item format] [(:type item) format]))
Eve: It accepts item and format to be exported. Examples:
;; Message
{:type :message :content "Say what again!"}
;; Activity
{:type :activity :content "Quoting Ezekiel 25:17"}
;; Formats
:pdf, :xml
Eve: And now you just provide a functions for different combinatations, and dispatcher decide
which one to call.
(defmethod export [:activity :pdf] [item format]
(exporter/activity->pdf item))
(defmethod export [:activity :xml] [item format]
(exporter/activity->xml item))
(defmethod export [:message :pdf] [item format]
(exporter/message->pdf item))
(defmethod export [:message :xml] [item format]
(exporter/message->xml item))
Pedro: What if unknown format passed?
Eve: We could specify default dipatcher function.
(defmethod export :default [item format]
(throw (IllegalArgumentException. "not supported")))
Pedro: Ok, but there is no hierarchy for :pdf and :xml. They are just keywords?
Eve: Correct, simple problem - simple solution. If you need advanced features, you could use
adhoc hierarchies or dispatch by class.
(derive ::pdf ::format)
(derive ::xml ::format)
Pedro: Quadrocolons?!
Eve: Assume they are just keywords.
Pedro: Ok.
Eve: Then you add functions for every dispatch type ::pdf, ::xml and ::format
(defmethod export [:activity ::pdf])
(defmethod export [:activity ::xml])
(defmethod export [:activity ::format])
Eve: If some new format (i.e. csv) appears in the system
(derive ::csv ::format)
Eve: It will be dispatched to ::format function, until you add a separate ::csv function.
Pedro: Seems good.
Eve: Definitely, much easier.
Pedro: So, basically, if a language support multiple dispatch, you don’t need Visitor
pattern?
Eve: Exactly.
