# Episode 11: Interpreter

Episode 11: Interpreter
Bertie Prayc stole important data from our server and shared it via BitTorrent system. Create a fake
account for Bertie to discredit him.
Pedro: BitTorrent system based on .torrent files. We need to write Bencode encoder.
Eve: Yes, but first let’s agree on the format spec
Bencode encoding rules:
Two datatypes are supported:
Integer N is encoded as i<N>e. (42 = i42e)
String S is encoded as <length>:<contents> (hello = 5:hello)
Two containers are supported:
List of values is encoded as l<contents>e ([1, “Bye”] = li1e3:Byee)
Map of values is encoded as d<contents>e ({“R” 2, “D” 2} = d1:Ri2e1:Di2ee)
Keys are just strings, Values are any bencode element
Pedro: Seems easy.
Eve: Maybe, but take into account that values may be nested, list inside list, etc.
Pedro: Sure. I think we can use Interpreter pattern for bencode encoding.
Eve: Try it.
Pedro: We start from interface for all bencode elements
interface BencodeElement {
String interpret();
}
Pedro: Then we provide implementation for each datatype and datacontainer
class IntegerElement implements BencodeElement {
private int value;
public IntegerElement(int value) {
this.value = value;
}
@Override
public String interpret() {
return "i" + value + "e";
}
}
class StringElement implements BencodeElement {
private String value;
StringElement(String value) {
this.value = value;
}
@Override
public String interpret() {
return value.length() + ":" + value;
}
}
class ListElement implements BencodeElement {
private List<? extends BencodeElement> list;
ListElement(List<? extends BencodeElement> list) {
this.list = list;
}
@Override
public String interpret() {
String content = "";
for (BencodeElement e : list) {
content += e.interpret();
}
return "l" + content + "e";
}
}
class DictionaryElement implements BencodeElement {
private Map<StringElement, BencodeElement> map;
DictionaryElement(Map<StringElement, BencodeElement> map) {
this.map = map;
}
@Override
public String interpret() {
String content = "";
for (Map.Entry<StringElement, BencodeElement> kv : map.entrySet()) {
content += kv.getKey().interpret() + kv.getValue().interpret();
}
return "d" + content + "e";
}
}
Pedro: And finally, our bencoded string can be constructed from common datastructures
programmatically
// discredit user
Map<StringElement, BencodeElement> mainStructure = new HashMap<StringElement, Bencod
// our victim
mainStructure.put(new StringElement("user"), new StringElement("Bertie"));
// just downloads files
mainStructure.put(new StringElement("number_of_downloaded_torrents"), new IntegerEle
// and nothing uploads
mainStructure.put(new StringElement("number_of_uploaded_torrents"), new IntegerEleme
// and nothing donates
mainStructure.put(new StringElement("donation_in_dollars"), new IntegerElement(0));
// prefer dirty categories
mainStructure.put(new StringElement("preffered_categories"),
new ListElement(Arrays.asList(
new StringElement("porn"),
new StringElement("murder"),
new StringElement("scala"),
new StringElement("pokemons")
)));
BencodeElement top = new DictionaryElement(mainStructure);
// let's totally discredit him
String bencodedString = top.interpret();
BitTorrent.send(bencodedString);
Eve: Interesting, but that is ton of code!
Pedro: We pay readability for capabilities.
Eve: I suppose you’ve heard concept Code is Data, that’s a lot easier in clojure
;; multimethod to handle bencode structure
(defmulti interpret class)
;; implementation of bencode handler for each type
(defmethod interpret java.lang.Long [n]
(str "i" n "e"))
(defmethod interpret java.lang.String [s]
(str (count s) ":" s))
(defmethod interpret clojure.lang.PersistentVector [v]
(str "l"
(apply str (map interpret v))
"e"))
(defmethod interpret clojure.lang.PersistentArrayMap [m]
(str "d"
(apply str (map (fn [[k v]]
(str (interpret k)
(interpret v))) m))
"e"))
;; usage
(interpret {"user" "Bertie"
"number_of_downloaded_torrents" 623
"number_of_uploaded_torrent" 0
"donation_in_dollars" 0
"preffered_categories" ["porn"
"murder"
"scala"
"pokemons"]}
Eve: You see how it is much easier define specific data?
Pedro: Sure, and interpret it’s just a function per bencode type, instead of separate class.
Eve: Correct, interpreter is nothing but a set of functions to process a tree.
