"""Real Firefox extension smoke tests. Runs only in a disposable WebDriver profile."""
import json,os,threading
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait,Select
from selenium.webdriver.support import expected_conditions as EC
class Fixture(BaseHTTPRequestHandler):
 def do_GET(self):
  self.send_response(200);self.send_header('Content-Type','text/html');self.end_headers();self.wfile.write(b'<!doctype html><title>Exam fixture</title><h1>Practice exam</h1><button id="hash" onclick="location.hash=\'exams/take_driver/9001\'">Other exam</button><button id="history" onclick="history.pushState({},\'\',\'/other\')">Other page</button>')
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Fixture);threading.Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://localhost:{server.server_port}';ext='moz-extension://11111111-2222-4333-8444-555555555555/'
options=Options();options.add_argument('-headless');binary=os.environ.get('FIREFOX_BINARY')
if binary:options.binary_location=binary
options.set_preference('extensions.webextensions.uuids',json.dumps({'lock-in@focus.invalid':'11111111-2222-4333-8444-555555555555'}));options.set_preference('extensions.allowPrivateBrowsingByDefault',True)
driver=webdriver.Firefox(options=options,service=Service(service_args=["--allow-system-access"]));wait=WebDriverWait(driver,15)
def elem(name):return driver.find_element(By.NAME,name)
def fill(name,value):e=elem(name);e.clear();e.send_keys(value)
def click(id):driver.find_element(By.ID,id).click()
def api(code):return driver.execute_async_script('const done=arguments[arguments.length-1];(async()=>{'+code+'})().then(done,e=>done({error:e.message}));')
def ready():wait.until(lambda d:bool(d.find_element(By.ID,'incognito-status').text))
def start(focus,scope='exact'):
 fill('task','Practice exam');fill('focus',focus);Select(elem('scope')).select_by_value(scope);Select(elem('level')).select_by_value('locked');driver.find_element(By.CSS_SELECTOR,'#start .primary').click();wait.until(EC.visibility_of_element_located((By.ID,'active')));assert driver.find_element(By.ID,'feedback').text==''
def recover():
 result=api("return await browser.runtime.sendMessage({type:'finish',payload:{kind:'recovered'}})");assert not result.get('error'),result
try:
 driver.set_context('chrome')
 permission=api("const {ExtensionPermissions}=ChromeUtils.importESModule('resource://gre/modules/ExtensionPermissions.sys.mjs');await ExtensionPermissions.add('lock-in@focus.invalid',{permissions:['internal:privateBrowsingAllowed'],origins:[]});return true;")
 assert permission is True,permission
 driver.set_context('content');driver.install_addon(str(Path('public/lock-in-firefox.zip').resolve()),temporary=True);driver.get(ext+'index.html');ready();assert 'enabled' in driver.find_element(By.ID,'incognito-status').text
 fill('focus',origin+'/exam#9000');Select(elem('scope')).select_by_value('exact');click('more-resources')
 driver.find_element(By.ID,'check-url').send_keys(origin+'/exam#9001');click('check-rule');assert driver.find_element(By.ID,'rule-result').text=='Blocked by these rules.'
 fill('resources',origin+'/exam#9001');wait.until(lambda d:d.find_element(By.ID,'rule-result').text=='Allowed by these rules.')
 assert api("return await browser.declarativeNetRequest.getDynamicRules()")==[]
 assert api("return (await browser.storage.local.get('session')).session || null") is None
 fill('resources','')
 start(origin+'/exam#exams/take_driver/9000');popup=driver.current_window_handle
 wait.until(lambda d:' — Lock in' in d.title);print('PASS Firefox setup rule check and countdown title',flush=True)
 fill_element=driver.find_element(By.CSS_SELECTOR,'#extend input');fill_element.clear();fill_element.send_keys('17');driver.find_element(By.CSS_SELECTOR,'#extend button').click();wait.until(lambda d:'Added 17' in d.find_element(By.ID,'feedback').text)
 driver.switch_to.new_window('tab');driver.get(origin+'/exam#exams/take_driver/9000');wait.until(EC.presence_of_element_located((By.ID,'hash')));click('hash');wait.until(lambda d:'/blocked.html' in d.current_url);assert 'Not right now.' in driver.find_element(By.TAG_NAME,'body').text
 driver.get(origin+'/exam#exams/take_driver/9000');wait.until(EC.presence_of_element_located((By.ID,'history')));click('history');wait.until(lambda d:'/blocked.html' in d.current_url)
 driver.switch_to.window(popup);recover();driver.get(ext+'dashboard.html');wait.until(lambda d:'1 recoveries' in d.find_element(By.ID,'outcomes').text)
 print('PASS Firefox exact URL, hash, History API, add time, recovery and dashboard',flush=True)
 # A normal session covers private windows, but their attempted destinations are not recorded.
 driver.get(ext+'index.html');ready();start(origin,'domain');normal=driver.current_window_handle
 result=api("return await browser.windows.create({incognito:true,url:browser.runtime.getURL('index.html')})");assert not result.get('error'),result
 wait.until(lambda d:len(d.window_handles)>=3);private_handle=[h for h in driver.window_handles if h!=normal][-1];driver.switch_to.window(private_handle);ready()
 api("await browser.tabs.create({url:'"+origin.replace('localhost','127.0.0.1')+"'});return true;")
 wait.until(lambda d:len(d.window_handles)>=4);blocked_handle=[h for h in driver.window_handles if h not in [normal,private_handle]][-1];driver.switch_to.window(blocked_handle);wait.until(lambda d:'/blocked.html' in d.current_url)
 private_data=api("return await browser.runtime.sendMessage({type:'get'})");assert private_data['data']['session']['attempts']==[],private_data
 recover();driver.switch_to.window(private_handle);driver.get(ext+'index.html');ready();wait.until(EC.visibility_of_element_located((By.ID,'privacy-session-note')))
 result=api("return await browser.runtime.sendMessage({type:'start',payload:{task:'Private exam',focus:'"+origin+"',minutes:25,level:'locked',resources:[],private:true}})")
 assert 'cannot be isolated' in result.get('error',''),result
 assert api("return (await browser.storage.local.get('session')).session || null") is None
 assert api("return await browser.declarativeNetRequest.getSessionRules()")==[]
 print('PASS Firefox private coverage, private-attempt exclusion and isolated-start restriction',flush=True)
finally:driver.quit();server.shutdown()
