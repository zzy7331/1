import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20 text-center">
      <p className="text-sm font-medium text-zinc-500">页面不存在</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">
        没有找到你要查看的内容
      </h1>
      <p className="mt-4 text-zinc-600">该模板可能尚未发布、已失效或链接有误。</p>
      <Link
        href="/templates"
        className="mt-8 inline-flex rounded-md bg-zinc-900 px-5 py-3 text-sm font-medium text-white"
      >
        返回模板中心
      </Link>
    </main>
  );
}
