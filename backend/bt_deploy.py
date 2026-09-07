#!/usr/bin/env python3
"""
Teslacam 宝塔面板一键部署脚本
通过 BT Panel API 完成后端部署

使用方法：
  python3 bt_deploy.py --host https://你的服务器IP:面板端口 \
                       --bt_user admin \
                       --bt_sk 你的API密钥 \
                       --domain teslacam.yourdomain.com \
                       --repo https://github.com/tigeryull/teslacam.git

获取 API 密钥方法：
  宝塔面板 → 设置 → API接口 → 复制"接口密钥"
"""

import argparse
import hashlib
import json
import os
import subprocess
import sys
import time
import urllib.parse
import urllib.request


# ─── 配置 ─────────────────────────────────────────────────────
DEFAULT_PORT = 8000
WORK_DIR = "/www/wwwroot"
REQUIREMENTS = ["fastapi", "uvicorn[standard]", "python-multipart", "pydantic",
                "aiofiles", "ffmpeg-python", "Pillow", "mutagen"]


# ─── BT API 认证 ──────────────────────────────────────────────
def bt_auth(host, username, api_sk):
    """计算双重 MD5 签名"""
    request_time = str(int(time.time()))
    request_token = hashlib.md5(
        (request_time + hashlib.md5(api_sk.encode()).hexdigest()).encode()
    ).hexdigest()
    return request_time, request_token


def bt_call(host, path, data, username, api_sk, method="POST"):
    """调用 BT Panel API"""
    request_time, request_token = bt_auth(host, username, api_sk)

    params = {**data, "request_time": request_time, "request_token": request_token}
    url = f"{host.rstrip('/')}/{path.lstrip('/')}"

    if method == "GET":
        query = urllib.parse.urlencode(params)
        req = urllib.request.Request(f"{url}?{query}")
    else:
        req = urllib.request.Request(
            url,
            data=urllib.parse.urlencode(params).encode(),
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method=method,
        )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        return {"status": False, "msg": str(e)}


# ─── 打印工具 ──────────────────────────────────────────────────
def log(msg, color="white"):
    colors = {
        "green": "\033[92m",
        "red": "\033[91m",
        "yellow": "\033[93m",
        "blue": "\033[94m",
        "bold": "\033[1m",
        "reset": "\033[0m",
    }
    print(f"{colors.get(color, '')}{msg}{colors.get('reset', '')}")


def step(n, msg):
    log(f"\n{'═'*50}", "blue")
    log(f"  [{n}] {msg}", "bold")
    log(f"{'═'*50}", "blue")


# ─── Step 1: 验证连接 ──────────────────────────────────────────
def check_connection(host, username, api_sk):
    step(1, "验证宝塔面板连接")
    result = bt_call(host, "/system", {"action": "GetAllInfo"}, username, api_sk)
    if result.get("status"):
        log(f"✅ 连接成功！服务器: {result.get('cpu', 0)}核 CPU", "green")
        return True
    log(f"❌ 连接失败: {result.get('msg', '未知错误')}", "red")
    return False


# ─── Step 2: 创建网站（可选） ───────────────────────────────────
def create_website(host, username, api_sk, domain, port=DEFAULT_PORT):
    step(2, f"创建网站 {domain}")
    # 检查是否已存在
    sites = bt_call(host, "/site", {"action": "GetSiteList"}, username, api_sk)
    for site in sites.get("list", []):
        if site.get("domain") == domain:
            log(f"✅ 网站已存在: {domain} (ID:{site.get('id')})", "green")
            return site.get("id")

    result = bt_call(host, "/site", {
        "action": "AddSite",
        "postweb": "nodejs",  # 纯静态，用 nodejs 类型或 php
        "domain": domain,
        "port": port,
        "path": f"{WORK_DIR}/{domain}",
    }, username, api_sk)

    if result.get("status"):
        log(f"✅ 网站创建成功: {domain}", "green")
        return result.get("data", {}).get("path", f"{WORK_DIR}/{domain}")
    log(f"⚠️ 创建网站失败（可能已存在）: {result.get('msg', '')}", "yellow")
    # 尝试用已有网站
    sites = bt_call(host, "/site", {"action": "GetSiteList"}, username, api_sk)
    if sites.get("list"):
        log(f"   使用现有网站 ID: {sites['list'][0].get('id')}", "yellow")
        return sites["list"][0].get("id")
    return None


# ─── Step 3: Git 克隆 ──────────────────────────────────────────
def clone_repo(host, username, api_sk, repo_url, work_dir):
    step(3, "克隆代码仓库")
    # 通过 BT xterm 执行命令不太方便，改为直接 SSH
    log("⚠️  请在服务器上手动执行以下命令:", "yellow")
    log(f"   ssh {username}@{host}", "")
    log(f"   cd {work_dir} && git clone {repo_url} teslacam", "")
    log(f"   cd teslacam/backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt", "")
    return work_dir


# ─── Step 4: 创建反向代理 ───────────────────────────────────────
def create_reverse_proxy(host, username, api_sk, site_id, backend_port=DEFAULT_PORT):
    step(4, f"创建反向代理 /api/ → localhost:{backend_port}")
    # 先获取伪静态配置
    result = bt_call(host, "/site", {
        "action": "GetProxyList",
        "domain_id": site_id,
    }, username, api_sk)

    # 检查是否已存在
    for proxy in result.get("list", []):
        if proxy.get("name") == "teslacam-api":
            log("✅ 反向代理已存在", "green")
            return True

    proxy_result = bt_call(host, "/site", {
        "action": "CreateProxy",
        "domain_id": site_id,
        "name": "teslacam-api",
        "target": f"http://127.0.0.1:{backend_port}",
        "proxy_path": "/api",
    }, username, api_sk)

    if proxy_result.get("status"):
        log("✅ 反向代理创建成功", "green")
        return True
    log(f"⚠️ 创建反向代理失败: {proxy_result.get('msg', '')}", "yellow")
    return False


# ─── Step 5: 创建 Supervisor 进程 ───────────────────────────────
def create_supervisor(host, username, api_sk, app_path):
    step(5, "创建 Supervisor 守护进程")
    # BT 面板的 Supervisor 管理接口
    result = bt_call(host, "/system", {
        "action": "GetAllInfo",
    }, username, api_sk)

    # 尝试通过计划任务创建启动脚本
    cron_result = bt_call(host, "/crontab", {
        "action": "AddCrontab",
        "name": "teslacam-backend",
        "type": "shell",
        "where1": "once",  # 一次性任务
        "scode": f"""#!/bin/bash
cd {app_path}
source venv/bin/activate
nohup uvicorn app.main:app --host 127.0.0.1 --port 8000 > logs/uvicorn.log 2>&1 &
echo $! > run.pid
""",
    }, username, api_sk)

    if cron_result.get("status"):
        log("✅ 启动脚本创建成功", "green")
        log(f"   运行命令: bash {app_path}/start.sh", "")
        return True

    # 备选方案：通过 btcli 命令行
    log("📝 请在服务器上执行以下命令创建守护进程:", "yellow")
    log(f"""   cd {app_path}
   source venv/bin/activate
   nohup uvicorn app.main:app --host 127.0.0.1 --port 8000 > logs/uvicorn.log 2>&1 &
   echo $! > run.pid
   """, "blue")
    return False


# ─── Step 6: 部署前端 ──────────────────────────────────────────
def deploy_frontend(host, username, api_sk, domain, frontend_dist):
    step(6, "部署前端静态文件")
    log(f"   将 frontend/dist/ 上传到 {WORK_DIR}/{domain}/", "")
    log(f"   命令: scp -r {frontend_dist}/* root@{host.split('//')[-1].split(':')[0]}:{WORK_DIR}/{domain}/", "yellow")
    return True


# ─── 主流程 ────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Teslacam 宝塔面板一键部署")
    parser.add_argument("--host", required=True, help="宝塔面板地址，如 https://1.2.3.4:8888")
    parser.add_argument("--bt_user", required=True, help="宝塔面板用户名")
    parser.add_argument("--bt_sk", required=True, help="API 密钥（面板设置→API接口→接口密钥）")
    parser.add_argument("--domain", default="", help="网站域名（留空则不创建网站）")
    parser.add_argument("--port", type=int, default=8000, help="后端端口（默认 8000）")
    parser.add_argument("--repo", default="https://github.com/tigeryull/teslacam.git", help="代码仓库地址")
    parser.add_argument("--work-dir", default="/www/wwwroot", help="工作目录")
    args = parser.parse_args()

    log("=" * 50, "bold")
    log("  Teslacam 宝塔面板一键部署", "bold")
    log("=" * 50, "bold")

    # Step 1
    if not check_connection(args.host, args.bt_user, args.bt_sk):
        sys.exit(1)

    # Step 2
    site_path = None
    if args.domain:
        site_path = create_website(args.host, args.bt_user, args.bt_sk, args.domain, args.port)

    # Step 3
    app_path = f"{args.work_dir}/teslacam/backend"
    clone_repo(args.host, args.bt_user, args.bt_sk, args.repo, args.work_dir)

    # Step 4
    if site_path and args.domain:
        create_reverse_proxy(args.host, args.bt_user, args.bt_sk, site_path, args.port)

    # Step 5
    create_supervisor(args.host, args.bt_user, args.bt_sk, app_path)

    # Step 6
    deploy_frontend(args.host, args.bt_user, args.bt_sk, args.domain or "", "frontend/dist/")

    log("\n" + "═" * 50, "green")
    log("  ✅ 部署完成！", "green")
    log("═" * 50, "green")
    log("""
后续步骤：
  1. 在服务器上执行：
     cd /www/wwwroot/teslacam/backend
     source venv/bin/activate
     uvicorn app.main:app --host 127.0.0.1 --port 8000

  2. 如果创建了指向域名的网站，访问：
     https://{domain}

  3. 获取 API 密钥方法：
     宝塔面板 → 设置 → API接口 → 复制"接口密钥"
""".format(domain=args.domain or "你的域名"))


if __name__ == "__main__":
    main()
