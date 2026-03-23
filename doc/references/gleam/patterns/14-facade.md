# Episode 14: Facade

Episode 14: Facade
Our new member Eugenio Reinn Jr. commited file with diff in 134 lines to processing servlet. But
actual work is just to process request. All other code injection and imports. It MUST be one line
commit.
Pedro: Who cares how many lines are committed?
Eve: Someone cares.
Pedro: Let’s see where is the problem
class OldServlet {
@Autowired
RequestExtractorService requestExtractorService;
@Autowired
RequestValidatorService requestValidatorService;
@Autowired
TransformerService transformerService;
@Autowired
ResponseBuilderService responseBuilderService;
public Response service(Request request) {
RequestRaw rawRequest = requestExtractorService.extract(request);
RequestRaw validated = requestValidatorService.validate(rawRequest);
RequestRaw transformed = transformerService.transform(validated);
Response response = responseBuilderService.buildResponse(transformed);
return response;
}
}
Eve: Oh shi…
Pedro: That’s our internal API for developers, every time they need to process request, inject 4
services, include all imports, and write this code.
Eve: Let’s refactor it with…
Pedro: …Facade pattern. We resolve all dependencies to a single point of access and simplify
API usage.
public class FacadeService {
@Autowired
RequestExtractorService requestExtractorService;
@Autowired
RequestValidatorService requestValidatorService;
@Autowired
TransformerService transformerService;
@Autowired
ResponseBuilderService responseBuilderService;
RequestRaw extractRequest(Request req) {
return requestExtractorService.extract(req);
}
RequestRaw validateRequest(RequestRaw raw) {
return requestValidatorService.validate(raw);
}
RequestRaw transformRequest(RequestRaw raw) {
return transformerService.transform(raw);
}
Response buildResponse(RequestRaw raw) {
return responseBuilderService.buildResponse(raw);
}
}
Pedro: Then if you need any service or set of services in the code you just injecting facade to
your code
class NewServlet {
@Autowired
FacadeService facadeService;
Response service(Request request) {
RequestRaw rawRequest = facadeService.extractRequest(request);
RequestRaw validated = facadeService.validateRequest(rawRequest);
RequestRaw transformed = facadeService.transformRequest(validated);
Response response = facadeService.buildResponse(transformed);
return response;
}
}
Eve: Wait, you’ve just moved all dependencies to one and everytime using this one, correct?
Pedro: Yes, now everytime some functionality is needed, use FacadeService. Dependency
is already there.
Eve: But we did the same in Mediator pattern?
Pedro: Mediator is behavioral pattern. We resolved all dependency to Mediator and added new
behavior to it.
Eve: And facade?
Pedro: Facade is structural, we don’t add new functionality, we just expose existing functionality
with facade.
Eve: Got it. But seems that pattern very loud word for such little tweak.
Pedro: Maybe.
Eve: Here is clojure version using structure by namespaces
(ns application.old-servlet
(:require [application.request-extractor :as re])
(:require [application.request-validator :as rv])
(:require [application.transformer :as t])
(:require [application.response-builder :as rb]))
(defn service [request]
(-> request
(re/extract)
(rv/validate)
(t/transform)
(rb/build)))
Eve: Exposing all services via facade.
(ns application.facade
(:require [application.request-extractor :as re])
(:require [application.request-validator :as rv])
(:require [application.transformer :as t])
(:require [application.response-builder :as rb]))
(defn request-extract [request]
(re/extract request))
(defn request-validate [request]
(rv/validate request))
(defn request-transform [request]
(t/transform request))
(defn response-build [request]
(rb/build request))
Eve: And use it.
(ns application.old-servlet
(:use [application.facade]))
(defn service [request]
(-> request
(request-extract)
(request-validate)
(request-transform)
(request-build)))
Pedro: What the difference between :use and :require?
Eve: They are almost similar, but with :require you expose functionality via namespace
qualificator (namespace/function) where with :use you can refer to it directly
(function)
Pedro: So, :use is better.
Eve: No, be aware of :use because it can conflict with existing names in your namespace.
Pedro: Oh, I see your point. And every time you call (:use [application.facade]) in
some namespace all existing functionality from facade is available?
Eve: Yes.
Pedro: Pretty the same.
