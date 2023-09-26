<div align="center">
  <br>
    <a href="https://getconduit.dev" target="_blank"><img src="https://getconduit.dev/conduitLogo.svg" height="80px" alt="logo"/></a>
    <br/>
    <h3>The only Backend you'll ever need.</h3>
</div>

# Conduit Module Example

This repo contains a minimal implementations for a [Conduit](https://github.com/ConduitPlatform/Conduit)
module written in Node.js and TypeScript.<br />

It's meant to be referenced while reading through [Conduit's SDK Documentation](https://getconduit.dev/docs/sdk/)
and used as a starting point for building your own Conduit modules.

It is assumed that you've already read through the aforementioned documentation,
and any critical prerequisites that may list, and familiarized yourself with the concepts discussed.

If you need any sort of help or wish to suggest improvements over the code or docs,
do not hesitate to open an issue or let us know on our [Discord](https://discord.com/invite/fBqUQ23M7g).

## Module Description 🧩

Our application allows our users to receive free cookies 🍪 via client API requests,
as long as our cookie resources are not depleted and their name is not blacklisted in our configuration.

As far as REST and GraphQL APIs are concerned, we offer two client endpoints for receiving cookies.<br />
One of them is unprotected, while the other one requires user authentication.<br />
There's also an administrative endpoint for updating our cookie stocks.

When it comes to gRPC, we also provide two administrative RPCs for receiving and replenishing cookies.<br />
Cookies are also automatically replenished on service startup.

Our module's configuration allows us to specify an array of names that won't be receiving cookies,
disable the unauthenticated cookie retrieving endpoint and set the starting amount of cookies
(also used on resets without an explicitly specified cookie count value).

We utilize Prometheus metrics for tracking the total amount of cookie requests received and the count for currently available cookies.<br />
We also log informational messages and errors through Loki.

_Tip: Conduit automatically generates documentation for both REST (Swagger) and GraphQL endpoints._

Administrative APIs:
- gRPC
- REST
- GraphQL (optionally enabled through Conduit's Admin Panel)

Application APIs:
- REST
- GraphQL

## Building 🔨

It is assumed that you are building and running this in a Linux or macOS environment.<br />
If you're using Windows, make sure you're using WSL.

``` bash
# Install Dependencies
npm run setup
# Build Module
npm run build
```

## Running 💻

We assume that you've already brought up a Conduit deployment using the [Conduit CLI](https://getconduit.dev/docs/cli).<br />
Make sure your deployment's major version matches the one of the example module implementation being used!

If you don't intend to use the default deployment configuration provided by Conduit CLI
(eg: by running Conduit directly on the host), make sure that you update the provided `.env` file.

``` bash
# Start Module
npm run start
```

## Now What 🤔

We suggest that you start out by verifying your module's example endpoints are registered and operational.<br />
Once you get a grasp of how the code comes together, you may proceed to altering its behavior and expanding its functionality.

Bringing up Conduit through the CLI should have already redirected you to your admin dashboard.<br />
You may locate the Swagger and GraphQL related resources referenced below through the relevant elements in the home page.

_Tip: Default Admin Credentials: `admin/admin`_

## Performing Requests

This section assumes that you are already aware of how to utilize Conduit's
[user](../modules/authentication/strategies) and [admin](../administration) authentication headers.<br />
Additionally, the application APIs' [security clients](../modules/router/security) are assumed to be disabled.

### REST
You may perform REST requests and browse your endpoint documentation directly through Swagger UI,
or by importing your APIs' Swagger JSON files to an HTTP API testing tool of your choice.

We'll proceed with a few `curl` examples to get you started:

#### Getting Cookies

Let's start off by simply requesting a cookie.<br />
We'll go by Stan for this one, as that name is not blacklisted in the default configuration.

``` bash title="Get Cookie (Unauthenticated)"
curl --location --request POST 'http://localhost:3000/example/cookies/' \
     --header 'Content-Type: application/json' \
     --data-raw '{
         "name": "Stan"
     }'
```
``` bash title="Response"
{
    "result": "Hey there Stan, have a cookie 🍪."
}
```

Great, we got our first cookie, hopefully they're not keeping tabs on us, so we can ask for more soon.
Let's try once more, this time going by Betty.

``` bash title="Get Cookie (Unauthenticated)"
curl --location --request POST 'http://localhost:3000/example/cookies/' \
     --header 'Content-Type: application/json' \
     --data-raw '{
         "name": "Betty"
     }'
```
``` bash title="Response"
{
    "result": "I'm sorry Betty, no cookies for you today 💅."
}
```

Ouch, that hurt. But hey, thankfully for Betty and regrettably for our application,
clients can provide any name they wish and our endpoint will gladly accept that.

Moving on, let's try the proper user authenticated endpoint.<br />
We assume you already know how to [create and authenticate your users](../modules/authentication/strategies)
and have already obtained our own user authentication token.

``` bash title="Get Cookie (User Authentication)"
curl --location --request GET 'http://localhost:3000/example/cookies' \
     --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYzODhjZTVlZTFlMDAzYjdmZGU4YzY1ZiIsImF1dGhvcml6ZWQiOnRydWUsInN1ZG8iOnRydWUsImlhdCI6MTY2OTk5MjYzNiwiZXhwIjoxNjczNTkyNjM2fQ.oCAELwBektsfINwa1EaxmrhtSVuhM7xvcccf2xQb948'
```
``` bash title="Response"
{
    "result": "Hey there guacamole.lover97, have a cookie 🍪."
}
```

That's a weird looking name, what's going on here and where did we even get a name for this?<br />
Looking into our endpoint's implementation you'll realize we're basically stripping off the user's email prefix
and using that as the implicitly provided name for our cookie request.

``` typescript title="GetCookieAuthenticated Handler Snippet"
const user: User = call.request.context.user;
const name = user.email.split('@')[0];
```

The Authentication module's User schema does not have a `firstName` or `lastName` field attached to it.<br />
That is simply because not all application use cases require that it does.<br />
You may still extend the schema as you see fit by providing additional fields for it both through
the Database module's CMS functionality available right in your admin panel, or through your custom microservice.<br />
You may then update this endpoint to utilize your extension field instead.

As a final step, let's modify our name blacklist through an administrative module configuration request.<br />
We'll start by viewing our existing configuration.

We assume you're already aware of [how to work with admin authentication headers](../administration).

``` bash title="Get Module Configuration (Admin Authentication)"
curl --location --request GET 'http://localhost:3030/config/exampleModule/' \
     --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYzN2FiNzE3NjYxMzk4ZDUzNTBhZjhmYyIsImlhdCI6MTY2OTk5MjE1MSwiZXhwIjoxNjcwMDY0MTUxfQ.lgLnkrx_FDlUCsD5wNtXfMc3GKG41Eq7xN4BrnMznrw' \
     --header 'masterkey: M4ST3RK3Y' \
     --header 'Content-Type: application/json'
```
``` bash title="Response"
{
    "config": {
        "active": true,
            "defaultCookieCount": 20,
            "illegalNames": [
                "Alex",
                "Betty",
                "Charlie"
            ]
    }
}
```

Alright then, say we wish to remove Betty from the blacklist.<br />
We'd send a PATCH request, updating our `example` module's configuration.<br />

``` bash title="Update Module Configuration (Admin Authentication)"
curl --location --request PATCH 'http://localhost:3030/config/exampleModule/' \
     --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYzN2FiNzE3NjYxMzk4ZDUzNTBhZjhmYyIsImlhdCI6MTY2OTk5MjE1MSwiZXhwIjoxNjcwMDY0MTUxfQ.lgLnkrx_FDlUCsD5wNtXfMc3GKG41Eq7xN4BrnMznrw' \
     --header 'masterkey: M4ST3RK3Y' \
     --header 'Content-Type: application/json' \
     --data-raw '{
         "config": {
             "illegalNames": [
                 "Alex",
                 "Charlie"
             ]
         }
}'
```
``` bash title="Response"
{
    "config": {
        "active": true,
        "defaultCookieCount": 20,
        "illegalNames": [
            "Alex",
            "Charlie"
        ]
    }
}
```

Our configuration was updated successfully.<br />
Notice how we only provided the configuration fields we wished to update.

This time around, if you were to perform another cookie retrieval request as Betty, the operation would be successful.

### GraphQL
You may perform GraphQL queries and mutations directly through the GraphQL Playground,
or through an GraphQL API testing tool of your choice.

Check the generated GraphQL documentation for details.

### gRPC
Import `src/service.proto` in a gRPC testing tool of your choice and specify `0.0.0.0:55152` as your server's address.<br />
You may then perform your gRPC requests.
