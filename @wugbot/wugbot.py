from twython import Twython, TwythonError
import time, sys

APP_KEY = 'xxx'
APP_SECRET = 'yyy'
OAUTH_TOKEN = 'zzz'
OAUTH_TOKEN_SECRET = 'aaa'

twitter = Twython(APP_KEY, APP_SECRET, OAUTH_TOKEN, OAUTH_TOKEN_SECRET)

bad_words = [" -RT"]
good_words = ["wugbot", "computational linguist"]
filter = " OR ".join(good_words)
blacklist = " -".join(bad_words)
keywords = filter + blacklist

search_results = twitter.search(q=keywords, count=10)
try:
    for tweet in search_results["statuses"]:
        try:
            twitter.retweet(id = tweet["id_str"])
        except TwythonError as e:
            print e
        time.sleep(500)
except TwythonError as e:
    print e
