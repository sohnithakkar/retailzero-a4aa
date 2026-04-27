export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="container mx-auto flex h-14 items-center justify-center px-4">
        <p className="text-sm text-gray-500">
          &copy; {new Date().getFullYear()} EduZero. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
